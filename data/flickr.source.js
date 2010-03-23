/*!
 * YoxView Flickr plugin
 * http://yoxigen.com/yoxview/
 *
 * Copyright (c) 2010 Yossi Kolesnicov
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Date: 8th March, 2010
 * Version : 1.01
 */
function yoxview_flickr()
{
    var flickrUrl = "http://www.flickr.com/";
    var flickrApiUrl = "http://api.flickr.com/services/rest/";
    var yoxviewFlickrApikey = "cd6c91f9721f34ead20e6ebe03dd5871";
    var flickrUserIdRegex = /\d+@N\d+/;
    
    var fixedOptions = {
        api_key : yoxviewFlickrApikey,
        format : 'json'       
    };
        
    this.getImagesData = function(yoxviewApi, container, options, dataOptions)
    {
        var defaults = {
            imagesSize: "medium", // medium/large/original, for large, your images in Flickr must be 1280 in width or more. For original, you must allow originals to be downloaded
            thumbnailsMaxSize: "smallSquare",
            setThumbnail: true,
            setSinglePhotosetThumbnails: true,
            setTitle: true,
            method: 'flickr.photosets.getList'
        };

        var datasourceOptions = jQuery.extend({}, defaults, dataOptions.dataSourceOptions, fixedOptions);
        datasourceOptions.media = "photos";
        
        if (datasourceOptions.user && datasourceOptions.photoset_id)
            datasourceOptions.method = "flickr.photosets.getPhotos";
                    
        var screenSize = screen.width > screen.height ? screen.width : screen.height;
        
        // Save resources for smaller screens:
        if (!datasourceOptions.imagesSize || (screenSize.width <= 800 && datasourceOptions.imagesSize != "medium"))
            datasourceOptions.imagesSize = "medium";

        var images = new Array();
        
        var thumbnailsWithPhotosets = 0;
        var flickrRegex = /http:\/\/(www.)?flickr.com\/photos\/([^\/]+)\/sets\/([^\?]+).*/;
        
        container.find("a:has(img)").each(function(){
        
            var thumbnail = $(this);
            var urlMatch = this.href.match(flickrRegex);
            
            if (urlMatch)
            {
                var flickrInfo = { user : urlMatch[2], photoset_id : urlMatch[3] };
                
                var thumbnailData = thumbnail.data("yoxview");
                
                if (thumbnailData)
                    jQuery.extend(thumbnailData, flickrInfo);
                else
                    thumbnail.data("yoxview", flickrInfo);
                
                var viewData = thumbnail.parent().data("yoxview");
                
                thumbnail.bind("click.yoxview", function(){
                    var thumbnailData = $(this).data("yoxview");
                    
                    if (!viewData.imagesAreSet)
                    {
                        thumbnail.css("cursor", "wait");
                        var callOptions = {
                            method : "flickr.photosets.getPhotos",
                            api_key : yoxviewFlickrApikey,
                            format : 'json',
                            media : 'photos'
                        };

                        $.jsonp({
                            url: flickrApiUrl,
                            data: jQuery.extend({}, datasourceOptions, thumbnailData, callOptions),
                            dataType: 'jsonp',
                            callbackParameter: "jsoncallback",
                            success: function(data)
                            {
                                var imagesData = new Array();
                                flickr_getImagesDataFromJson(data, thumbnail, imagesData, datasourceOptions.imagesSize, datasourceOptions.thumbnailsMaxSize);
                                viewData.images = imagesData;
                                viewData.imagesAreSet = true;
                                thumbnail.css("cursor", "");
                                yoxviewApi.openGallery(viewData.viewIndex);
                            }
                        });
                    }
                    else
                        yoxviewApi.openGallery(thumbnail.parent().data("yoxview").viewIndex);
                        
                    return false;
                });

                thumbnailsWithPhotosets++;
            }
        });
        
        if (thumbnailsWithPhotosets == 0)
        {
            if (dataOptions.onLoadBegin)
                dataOptions.onLoadBegin();
            
            if (datasourceOptions.user && datasourceOptions.user.match(flickrUserIdRegex))
                datasourceOptions.user_id = datasourceOptions.user;

            if (!datasourceOptions.user_id && datasourceOptions.user && !datasourceOptions.photoset_id)
            {
                $.jsonp({
                    url: flickrApiUrl,
                    data: $.extend({}, datasourceOptions, {username : datasourceOptions.user, method: "flickr.people.findByUsername" }),
                    dataType: 'jsonp',
                    callbackParameter: "jsoncallback",
                    success: function(data){
                        if (!data.user && dataOptions.onLoadError)
                        {
                            dataOptions.onLoadError("User not found.");
                            return false;
                        }
                        datasourceOptions.user_id = data.user.nsid;
                        if (datasourceOptions.setTitle)
                        {
                            var setDetails = $("<div>", {
                                className : "yoxview-thumbnails-details"
                            });
                            var username = data.user.username._content;
                            setDetails.append(
                                "<h2><a href='" + flickrUrl + "photos/" + datasourceOptions.user_id + "' target='_blank' title=\"Go to " + username + "'s gallery in flickr\">" + username + "</a>'s sets:</h2>",
                                "<div style='clear:both;'></div>"
                            )
                            .prependTo(container);
                        }
                        
                        images = getData(container, options, datasourceOptions, dataOptions);
                    },
                    error : function(xOptions, textStatus){
                        if (dataOptions.onLoadError)
                            dataOptions.onLoadError("User not found. Have you tried using the NSID?");
                    }
                });
            }
            else
                images = getData(container, datasourceOptions, datasourceOptions, dataOptions);       
        }
        return images;
    }

    function getData(container, options, datasourceOptions, dataOptions)
    {
        var _viewIndex = container.data("yoxview").viewIndex;
        var images = new Array();
        $.jsonp({
            url: flickrApiUrl,
            async: false,
            data: datasourceOptions,
            dataType: 'jsonp',
            callbackParameter: "jsoncallback",
            success: function(data)
            {
                // multiple sets:
                if (data.photosets && data.photosets.photoset.length != 0)
                {
                    var thumbnailsList = $("<ul>", {
                        className : "yoxview-thumbnails"
                    });

                    thumbnailsList.appendTo(container);
                    jQuery.each(data.photosets.photoset, function(i, photoset){
                        var photosetName = photoset.title
                            ? photoset.title._content
                            : "Set";
                        photosetName += " (" + photoset.photos + " images)";
 
                        var photosetThumbnail = getImageUrl(photoset, flickrImageSizes[datasourceOptions.thumbnailsMaxSize]);
                        var photosetUrl = flickrUrl + "photos/" + (datasourceOptions.user || datasourceOptions.user_id) + "/sets/" + photoset.id;

                        var listItem = $("<li>", {
                            css: {
                                "width" : "75px",
                                "height" : "75px"
                            }
                        });
                        
                        var thumbnail = createThumbnail(
                            photosetUrl,
                            photosetName,
                            photosetName,
                            photosetThumbnail,
                            _viewIndex);
                          
                        thumbnail.data("yoxview", {
                            user : datasourceOptions.user, 
                            user_id : datasourceOptions.user_id, 
                            photoset_id : photoset.id 
                        })
                        .appendTo(listItem);

                        listItem.appendTo(thumbnailsList);
                        listItem.yoxview(options, dataOptions);
                    });
                }
                // single photoset:
                else if(data.photoset && data.photoset.photo.length != 0 && options.setSinglePhotosetThumbnails)
                {
                    flickr_getImagesDataFromJson(data, undefined, images, datasourceOptions.imagesSize, datasourceOptions.thumbnailsMaxSize)
                    container.addClass("yoxview-thumbnails");
                    
                    if (options.setTitle)
                    {
                        var setDetails = $("<div>", {
                            className : "yoxview-thumbnails-details"
                        });
                        
                        $.jsonp({
                            url: flickrApiUrl,
                            async: false,
                            data: $.extend({}, 
                                { method: 'flickr.photosets.getInfo', photoset_id: options.photoset_id},
                                fixedOptions),
                            dataType: 'jsonp',
                            callbackParameter: "jsoncallback",
                            success: function(data)
                            {
                                var setData = data.photoset;
                                setDetails.append(
                                    "<h2>" + setData.title._content + "</h2>",
                                    "By ",
                                    "<a href='" + flickrUrl + "photos/" + setData.owner + "' title=\"Go to " + (options.user || "the user's") + "'s flickr page\" target='_blank'>" + options.user + "</a>",
                                    "<div style='clear:both;'></div>"
                                )
                                .prependTo(container);
                            }
                        });
                    }
                        
                    $.each(images, function(imageIndex, imageData)
                    {
                        var thumbnail = createThumbnail(
                            imageData.src,
                            imageData.alt,
                            imageData.title,
                            imageData.thumbnailSrc
                        );
                        imageData.thumbnailImg = thumbnail.children("img:first");
                        
                        thumbnail.data("yoxview", { viewIndex : _viewIndex, imageIndex : imageIndex })
                        .bind("click.yoxview", function(){
                            var imageData = $(this).data("yoxview");
                            yoxviewApi.openGallery(imageData.viewIndex, imageData.imageIndex);
                            return false;
                        })
                        .appendTo(container);
                    });
                }
                if (dataOptions.onLoadComplete)
                    dataOptions.onLoadComplete();
            },
            error : function(xOptions, textStatus){
                if (dataOptions.onLoadError)
                    dataOptions.onLoadError("Can't load data from flickr.");
            }
        });
        
        return images;
    }
    var flickrImageSizes = {
        smallSquare : "_s", // 75x75
        thumbnail : "_t", // 100px
        small : "_m", // 240px
        medium : "", // 500px
        large : "_b", // 1024px
        original : "_o"
    };
    function getImageUrl(photoData, size)
    {
        return "http://farm" + photoData.farm + ".static.flickr.com/" + photoData.server + "/" + (photoData.primary || photoData.id) + "_" + photoData.secret + size + ".jpg";
    }
    function flickr_getImagesDataFromJson(data, thumbnail, imagesData, imagesSize, thumbnailsSize)
    {
        jQuery.each(data.photoset.photo, function(i, image){
            var imageData = {
                thumbnailSrc : getImageUrl(image, thumbnailsSize ? flickrImageSizes[thumbnailsSize] : flickrImageSizes.smallSquare),
                src: getImageUrl(image, imagesSize ? flickrImageSizes[imagesSize] : flickrImageSizes.medium),
                title: image.title,
                alt: image.title,
                link: "",
                thumbnailImg: thumbnail ? thumbnail.children("img:first") : null
            };
            
            imagesData.push(imageData);
        });
    }
}
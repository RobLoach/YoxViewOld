/*!
 * YoxView Picasa plugin
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
function yoxview_picasa()
{
    this.getImagesData = function(yoxviewApi, container, _options, dataOptions)
    {
        var defaults = {
            url: "http://picasaweb.google.com/data/feed/api/user/",
            setThumbnail: true,
            setSingleAlbumThumbnails: true,
            setTitle: true // Whether to add a header with user and/or album name before thumbnails
        };

        var options = jQuery.extend({}, defaults, dataOptions.dataSourceOptions);
        
        if (options.album == "")
            options.album = null;
            
        if (options.imagesMaxSize)
            options.imagesMaxSize = picasa_getMaxSize(options.imagesMaxSize, picasaImgMaxSizes);

        var screenSize = screen.width > screen.height ? screen.width : screen.height;
        
        // Save resources for smaller screens:
        if (!options.imagesMaxSize || screenSize < options.imagesMaxSize)
            options.imagesMaxSize = picasa_getMaxSize(screenSize, picasaImgMaxSizes);

        if (options.thumbnailsMaxSize)
            options.thumbnailsMaxSize = picasa_getMaxSize(options.thumbnailsMaxSize, picasaThumbnailSizes);

        var feedUrl = getFeedUrl(options);
        
        var images = new Array();
        var _viewIndex = container.data("yoxview").viewIndex;
        
        // Load single album:
        if (options.album)
        {
            if (dataOptions.onLoadBegin)
                dataOptions.onLoadBegin();
                
            $.jsonp({
                url: feedUrl,
                async: false,
                dataType: 'jsonp',
                callbackParameter: "callback",
                success: function(data)
                {
                    var thumbnail;
                    var thumbnailData = data.feed;
                    var albumTitle = thumbnailData.title.$t;
                    
                    if (!options.setSingleAlbumThumbnails && options.setThumbnail)
                    {
                        var albumTitle = albumTitle + " (" + thumbnailData.gphoto$numphotos.$t + " images)";
                        thumbnail = createThumbnail(
                            thumbnailData.link[1].href,
                            albumTitle,
                            albumTitle,
                            thumbnailData.icon.$t,
                            container.data("yoxview").viewIndex);
                        
                        thumbnail.bind("click.yoxview", function(){
                            var imageData = $(this).data("yoxview");
                            yoxviewApi.openGallery(imageData.viewIndex);
                            return false;
                        });
                        
                        thumbnail.appendTo(container);
                        yoxviewApi.thumbnail = thumbnail;
                    }
                    
                    picasa_getImagesDataFromJson(data, thumbnail, images);

                    if (options.setSingleAlbumThumbnails && images.length != 0)
                    {
                        container.addClass("yoxview-thumbnails");
                        
                        if (options.setTitle)
                        {
                            var albumDetails = $("<div>", {
                                className : "yoxview-thumbnails-details"
                            });
                            
                            var authorData = data.feed.author[0];
                            
                            albumDetails.append(
                                "<h2>" + albumTitle + "</h2>",
                                "By ",
                                "<a href='" + authorData.uri.$t + "' title=\"Go to " + authorData.name.$t + "'s Picasa page\" target='_blank'>" + authorData.name.$t + "</a>",
                                "<div style='clear:both;'></div>"
                            )
                            .prependTo(container);
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
                        dataOptions.onLoadError("Album '" + options.album + "' for user '" + options.user + "' not found.");
                }
            });
        }
        // Load multiple albums:
        else
        {
            var thumbnailsWithAlbums = 0;
            var picasaRegex = /http:\/\/picasaweb.google.com\/([^\/]+)\/([^\?]+).*/;
            
            container.find("a:has(img)").each(function(){
                var thumbnail = $(this);
                var urlMatch = this.href.match(picasaRegex);
                if (urlMatch)
                {
                    var picasaInfo = { user : urlMatch[1], album : urlMatch[2] };
                    var thumbnailData = thumbnail.data("yoxview");
                    
                    if (thumbnailData)
                        jQuery.extend(thumbnailData, picasaInfo);
                    else
                        thumbnail.data("yoxview", picasaInfo);
                    
                    var viewData = thumbnail.parent().data("yoxview");
                    
                    thumbnail.bind("click.yoxview", function(){
                        var thumbnailData = $(this).data("yoxview");
                        
                        if (!viewData.imagesAreSet)
                        {
                            thumbnail.css("cursor", "wait");

                            $.ajax({
                                url: getFeedUrl(jQuery.extend(options, thumbnailData)),
                                dataType: 'jsonp',
                                success: function(data)
                                {
                                    var imagesData = new Array();
                                    picasa_getImagesDataFromJson(data, thumbnail, imagesData);
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
                    thumbnailsWithAlbums++;
                }
            });
            
            if (thumbnailsWithAlbums == 0)
            {
                if (dataOptions.onLoadBegin)
                    dataOptions.onLoadBegin();

                $.jsonp({
                    url: feedUrl,
                    dataType: 'jsonp',
                    callbackParameter: "callback",
                    success: function(data)
                    {
                        if (!data.feed.entry)
                        {
                            if (dataOptions.onNoData)
                                dataOptions.onNoData();
                                
                            return;
                        }

                        if (options.setTitle)
                        {
                            var authorData = data.feed.author[0];
                            var albumDetails = $("<div>", {
                                className : "yoxview-thumbnails-details"
                            });
                            
                            albumDetails.append(
                                "<h2><a href='" + authorData.uri.$t + "' target='_blank' title=\"Go to " + authorData.name.$t + "'s gallery in Picasa\">" + authorData.name.$t + "</a>'s gallery</h2>",
                                "<div style='clear:both;'></div>"
                            )
                            .prependTo(container);
                        }
                        var thumbnailsList = $("<ul>", {
                            className : "yoxview-thumbnails"
                        });
                        thumbnailsList.appendTo(container);
                        
                        jQuery.each(data.feed.entry, function(i, album){
                    
                            if (album.gphoto$numphotos.$t != '0')
                            {
                                var albumName = album.title.$t + " (" + album.gphoto$numphotos.$t + " images)";
                                var albumThumbnail = album.media$group.media$thumbnail[0].url;
                                var albumUrl = album.link[1].href;
                                var listItem = $("<li>", {
                                    css: {
                                        "width" : album.media$group.media$thumbnail[0].width,
                                        "height" : album.media$group.media$thumbnail[0].height
                                    }
                                });

                                var thumbnail = createThumbnail(
                                    albumUrl,
                                    albumName,
                                    albumName,
                                    albumThumbnail,
                                    _viewIndex);
                                    
                                thumbnail.data("yoxview", {user : options.user, album : albumName })
                                .appendTo(listItem);
                                
                                listItem.appendTo(thumbnailsList)
                                .yoxview(_options, dataOptions);
                            }
                        });
                        
                        if (dataOptions.onLoadComplete)
                            dataOptions.onLoadComplete();
                    },
                    error : function(xOptions, textStatus){
                        if (dataOptions.onLoadError)
                            dataOptions.onLoadError("User '" + options.user + "' not found.");
                    }
                });   
            }
        }

        return images;
    }

    var picasaThumbnailSizes = [32, 48, 64, 72, 104, 144, 150, 160];
    var picasaImgMaxSizes = [94, 110, 128, 200, 220, 288, 320, 400, 512, 576, 640, 720, 800, 912, 1024, 1152, 1280, 1440, 1600];

    function getFeedUrl(options)
    {
        var feedUrl = options.url + options.user;
        
        if (options.album)
            feedUrl += "/album/" + options.album;
            
        feedUrl += "?imgmax=" + options.imagesMaxSize + "&alt=json";
        
        if (options.thumbnailsMaxSize)
            feedUrl += "&thumbsize=" + options.thumbnailsMaxSize;

        if (options.authkey)
            feedUrl += "&authkey=" + options.authkey;
            
        return feedUrl;
    }
    function picasa_getMaxSize(size, sizesArray)
    {
        for(var i=sizesArray.length; i >= 0; i--)
        {
            size = parseInt(size);
            var pSize = sizesArray[i];
            if (size >= pSize)
                return pSize;
        }
        
        return size;
    }
    function picasa_getImagesDataFromJson(data, thumbnail, imagesData)
    {
        jQuery.each(data.feed.entry, function(i, image){
            var imageTitle = image.summary.$t;
            var imageData = {
                thumbnailSrc : image.media$group.media$thumbnail[0].url,
                src: image.content.src,
                title: imageTitle,
                alt: imageTitle,
                link: image.link[1].href,
                thumbnailImg: thumbnail ? thumbnail.children("img:first") : null
            };

            imagesData.push(imageData);
        });
    }
}
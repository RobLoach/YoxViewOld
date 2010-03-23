function yoxview_thumbnails()
{
    this.getImagesData = function(yoxviewApi, container, options, dataOptions)
    {
        var thumbnails = container.find("a:has(img)");
        var images = new Array();

        thumbnails.each(function(i, thumbnail){
            var jThumbnail = $(thumbnail);
            var _viewIndex = container.data("yoxview").viewIndex;
            
            images.push(getImageDataFromThumbnail(jThumbnail, options));
            
            jThumbnail.data("yoxview", {viewIndex : _viewIndex, imageIndex : i})
            .bind('click.yoxview', function(){
                var imageData = $(this).data("yoxview");
                yoxviewApi.openGallery(imageData.viewIndex, imageData.imageIndex);
                return false;
            });
        });

        return images;
    }

    function getImageDataFromThumbnail(_thumbnail, options)
    {
        var thumbImg = _thumbnail.children("img:first");
        var imageData = {
            thumbnailImg : thumbImg,
            thumbnailSrc : thumbImg.attr("src"),
            src : _thumbnail.attr("href"),
            title : thumbImg.attr(options.titleAttribute),
            alt : thumbImg.attr("alt")
        };
        
        return imageData;
    }
}
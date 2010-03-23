var _yoxviewPath = getYoxviewPath();

document.write('<link rel="Stylesheet" type="text/css" href="' + _yoxviewPath + 'yoxview.css" />');

function LoadScript( url )
{
	document.write( '<scr' + 'ipt type="text/javascript" src="' + url + '"><\/scr' + 'ipt>' ) ;
}
LoadScript("http://ajax.googleapis.com/ajax/libs/jquery/1.4.2/jquery.min.js");
LoadScript(_yoxviewPath + "jquery.jsonp-1.0.4.min.js");
LoadScript(_yoxviewPath + "jquery.timers-1.2.min.js");
LoadScript(_yoxviewPath + "jquery.yoxview-1.1.min.js");

function getYoxviewPath()
{
    var scripts = document.getElementsByTagName("script");
    var regex = /(.*\/)yoxview.*/i;
    for(var i=0; i<scripts.length; i++)
    {
        var currentScriptSrc = scripts[i].src;
        if (currentScriptSrc.match(regex))
        return currentScriptSrc.match(regex)[1];
    }
    
    return null;
}
// Remove the next line's comment to apply yoxview without knowing jQuery to all containers with class 'yoxview':
//LoadScript(_yoxviewPath + "yoxview-nojquery.js"); 
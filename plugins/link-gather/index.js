function linkGather(options){
    return new Promise(function(resolve, reject) {
        try {
            function uniq(a) {
                var prims = {"boolean":{}, "number":{}, "string":{}}, objs = [];
                return a.filter(function(item) {
                    var type = typeof item;
                    if(type in prims)
                        return prims[type].hasOwnProperty(item) ? false : (prims[type][item] = true);
                    else
                        return objs.indexOf(item) >= 0 ? false : objs.push(item);
                });
            }
            var links = Array.from(document.getElementsByTagName('a'));
            var pllink = [];
            for (let x of links) {
                let splitLink = x.href.split('?');
                x = splitLink[0].split('#')[0];
                pllink.push(x);
            }
            if (options.internalOnly) {
                pllink = pllink.filter(link=> {
                    return (link.indexOf(window.location.host) > -1 || link.indexOf('https://') == -1);
                });
            }
            pllink = pllink.filter(link=>{
                let splitLink = link.split('.');
                let fileExt = splitLink[splitLink.length-1];
                return fileExt !== 'pdf' && fileExt !== 'jpg' && fileExt !== 'exe' && fileExt !== 'png' && fileExt !== 'svg';
            });
            pllink = uniq(pllink);
            resolve(pllink);
        }
        catch (e) {
            reject(e);
        }
    });
    
}
export default linkGather;
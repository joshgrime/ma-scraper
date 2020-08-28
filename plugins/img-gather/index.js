function imgGather(options){
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
            var imgs = Array.from(document.getElementsByTagName('img'));
            var pllink = [];
            for (let x of imgs) {
                if (typeof x.src === 'string') {
                    let splitLink = x.src.split('?');
                    x = splitLink[0].split('#')[0];
                    pllink.push(x);
                }
            }
            pllink = uniq(pllink);
            resolve(pllink);
        }
        catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    default:imgGather
}
var express = require('express');
var path = require('path');
var fs = require("fs");
var PSD = require('psd');
var cheerio = require('cheerio');
var rimraf = require('rimraf');
var compression = require('compression');
var app = express();
app.use(compression());

var psd = null;
var $ = null;
var $wrap = null;
var content = null;


// 把psd转换成png图片
PSD.open("feifan.psd").then(function (psd) {
  return psd.image.saveAsPng('./output.png');
}).then(function () {
  console.log("get png Finished!");
});

class exportPSD {
    constructor(){
        this.exportPath = "./export/";// 导出文件夹路径
        this.exportAppPath = "";// 导出的index.html根目录
        this.saveImgPath = "";// 图片的保存路径
        this.saveCssPath = "";// css保存路径
        this.oldTime = new Date();// 当前时间
        this.pngId = 0;
        this.groupId = 0;// 类名
        this.serverRes = null;// 没用
        this.cssStyle = ''; //css字符串
        this.file = process.argv[2];// node的方法返回一个数组 取下标为2的字符串  就是app.psd
        this.appName = '';// 文件夹名字
        this.viewRect = {};// 图片大小
    };

    /**
     * 创建目录
     * @param dirName
     * rimraf 包的作用：以包的形式包装rm -rf命令，用来删除文件和文件夹的，不管文件夹是否为空，都可删除
     */
    mkdir(dirName){
        var _self = this;
        var dir = _self.appName;
        rimraf(path.join(__dirname, _self.exportPath + dir), err => {
            if (err) throw err;
             fs.mkdir(_self.exportPath + dir + "/", function(d){
                _self.exportAppPath = _self.exportPath + dir + "/";

                fs.mkdir(_self.exportAppPath + "images", function(){
                    _self.saveImgPath = _self.exportAppPath + "images/";
                });
                fs.mkdir(_self.exportAppPath + "css", function(){
                    _self.saveCssPath = _self.exportAppPath + "css/";
                });

                _self.openPSD();
            });
        });
    };

    /**
     * 读取模板html文件，在此基础上生成新的结构
     */
    getPageHTML(){
        var _self = this;
        var divRoot = _self.file.replace(".", "");
        fs.readFile("template.html", function (err, data) {// 异步地读取一个文件的全部内容 data是文件内容
            var htmlString = data.toString();
            $ = cheerio.load(htmlString);
            $wrap = $(".wrap");
            $wrap.append('<div class="page_'+ divRoot +'"></div>');
            content = $wrap.find(".page_"+divRoot);
            console.log("export html start..." + _self.file);
            psd = PSD.fromFile(_self.file);
            psd.parse();
            _self.mkdir(_self.file);
        });
    };

    /**
     * 用PSD.open()先解析psd文件，分析文件
     */
    openPSD(){
        var _self = this;
        PSD.open(_self.file).then(function (psd) {
            var tree = psd.tree();
            var treeJson = tree.export();
            console.log(treeJson);
            _self.viewRect = {
                width:treeJson.document.width,
                height:treeJson.document.height
            };
            _self.findArrAndReverse(tree);

            tree.descendants().forEach(function (node) {
                if (node.isGroup()){
                    node.name = "group_"+_self.groupId;
                    _self.groupId++;
                    return false;
                }
                if (node.layer.visible){
                    node.name = "dv_" + _self.appName + "_layer_" + _self.pngId;
                    node.saveAsPng(_self.saveImgPath + node.name + ".png").catch(function (err) {
                        //console.log(err.stack);
                    });
                    _self.pngId++;
                }
            });

            // 把psd按图层结构处理为json文件并写入json.txt
            fs.writeFile("json.txt", JSON.stringify(treeJson, undefined, 2), {
                encoding:"utf8"
            }, function (err) {
                if (err) {
                    console.log(err); return;
                }
                console.log('存储psd数据结构success');
            });

            //生成结构
            var domJSON = tree.export();
            _self.createDivByJson(domJSON);

            //写入生成好的html结构
            fs.writeFile(_self.exportAppPath+"index.html", $.html(), {
                encoding:"utf8"
            }, function (err) {
                //console.log(err);
            });

            //写入css到style.css
            fs.writeFile(_self.saveCssPath+"style.css", _self.cssStyle, {
                encoding:"utf8"
            }, function (err) {
                //console.log(err);
            });

            //return psd.image.saveAsPng('./output.png');
        }).then(function () {
            var time = (new Date()) - _self.oldTime;
            console.log("export end!");
            console.log("end time:"+time+"ms");
        }).catch(function (err) {
            console.dir(err);
        });
    };

    /**
     * 根据json数据生成结构
     * @param jsons
     */
    createDivByJson(jsons) {
        var _self = this;
        var domJSON = jsons;
        var backGroundImgUrl = "images/";
        var childrenLen = domJSON.children.length;
        for (var i=0; i<domJSON.children.length; i++){
            var item = domJSON.children[i];
            if (item.type == "layer" && item.visible && item.width && item.height){
                var layer = '<div class="'+ item.name +'"></div>\n';
                _self.cssStyle+='.page_'+ _self.appName + ' .' + item.name +' { position: absolute; top:50%; width:'+ item.width/100 +'rem; height:'+ item.height/100 +'rem; left:'+ item.left/100 +'rem; margin-top:'+ -(_self.viewRect.height/100/2 - item.top/100) +'rem; background:url(../'+ (backGroundImgUrl+item.name) +'.png); background-size:100% auto; }\n';
                content.append(layer);
            }else if (item.type == "group" && item.visible){
                content.append('<div class="'+ item.name +'"></div>\n');
                content = content.find('.'+item.name);
                _self.createDivByJson(item);
            }
            //当前循环结束，重置$wrap
            if ( i == childrenLen-1){
                content = content.parent();
            }
        }
    };

    /**
     * 查询所有子对象，倒序赋值
     * @param obj {Object}
     */
    findArrAndReverse(obj) {
        var _self = this;
        var datas = obj;
        if (datas._children && datas._children.length > 0){
            _self.reverseALl(datas._children);
            for ( var i=0; i<datas._children.length; i++){
                var item = datas._children[i];
                _self.findArrAndReverse(item);
            }
        }else{
        }
    };
    /**
     * 倒序并赋值方法
     * @param children
     */
    reverseALl(children) {
        var newArr = children.reverse();
        children = newArr;
    };

    start(){
        var _self = this;
        if(_self.file){
            console.log(_self.file+'01');
            fs.exists(_self.file, function (res) {// 通过检查文件系统来测试给定的路径是否存在
                if (res){
                    _self.appName = _self.file.replace(".", "");
                    _self.getPageHTML();
                    console.log(_self.appName);
                }else{
                    console.log("psd文件路径不正确");
                }
            });
        }else{
            console.log("需要指定PSD文件哦");
        }
    }
}

var exportPsdFile = new exportPSD();
exportPsdFile.start();


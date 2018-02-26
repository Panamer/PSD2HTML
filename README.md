# PSD2HTML
Turn the PSD picture into a HTML page

利用psd包把需要的psd格式图片解析，再通过psd提供的方法得到png图片和psd图片的数据结构（json）
拿到png和json文件以后，进行处理生成html，并且以rem布局
可以大量简化前端的工作流


安装
npm  install

快速解析psd
npm start
npm run dev

正确解析psd方式
node app.js feifan.psd

压缩png图片
node imagemin.js feifanpsd

export :        用来存放导出的html css image
app.js  ：      主要执行文件
imagemin.js     压缩图片的js
.psd  ：       需要解析的图片

json.txt:       psd图片的数据结构（非必要）
output.png:     生成的png格式图片
templete.html:  模板文件
eslintrc.json   配置eslint
package.json
compression     提升性能使页面加载的文件变小加快请求，并不能压缩图片

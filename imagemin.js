const imagemin = require('imagemin');
// const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');
const dirName = process.argv[2];
imagemin(['export/' + dirName + '/images/*.{jpg,png}'], 'export/' + dirName + '/images', {
    plugins: [
        // imageminJpegtran(),
        imageminPngquant({quality: '65-80'})
    ]
}).then(files => {
    console.log(files);
    //=> [{data: <Buffer 89 50 4e …>, path: 'build/images/foo.jpg'}, …]
});

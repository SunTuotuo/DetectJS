const fs = require('fs');


const directoryPath = 'C:/Users/Administrator/Desktop/test/';
// 读取目录中的所有文件
fs.readdir(directoryPath, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    // 打印所有文件名
    files.forEach(file => {
        if (file.split('.')[1] == 'html' && file.split('.')[0].split('_')[1] >= 110 && file.split('.')[0].split('_')[1] <= 120) {
            // 文件夹路径
            const folderPath = `C:/Users/Administrator/Desktop/test/${file.split('.')[0]}/script`;

            // 读取文件夹内容
            fs.readdir(folderPath, (err, files) => {
                if (err) {
                    console.error('Error reading folder:', err);
                    return;
                }

                // 过滤出文件
                const fileNames = files.filter(file => fs.statSync(`${folderPath}/${file}`).isFile());

                // 找出最后一个文件名
                const lastFileName = fileNames.length > 0 ? fileNames[fileNames.length - 1] : null;

                if (lastFileName.split('_')[3].split('.')[0] != fileNames.length) {
                    console.log(file.split('.')[0]);
                    console.log(lastFileName.split('_')[3].split('.')[0]);
                    console.log(fileNames.length);
                }
            });
        }
    });
});

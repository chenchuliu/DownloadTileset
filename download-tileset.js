const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadB3dmFiles(tilesetUrl, outputDirectory) {
    try {
        // 发送HTTP请求获取tileset.json文件内容
        const response = await axios.get(tilesetUrl);
        const tilesetData = response.data;
        const jsonString = JSON.stringify(tilesetData, null, 2);
        if(!fs.existsSync(outputDirectory)){
            fs.mkdirSync(outputDirectory)
        }
        fs.writeFileSync(path.join(outputDirectory, getPathName(tilesetUrl)), jsonString);

        // 递归函数，用于处理嵌套的b3dm文件
        async function downloadNestedB3dmFiles(node, currentPath) {
            if (node.content && node.content.uri) {
                if (node.content.uri.includes('.b3dm')) {
                    const relativePath = path.dirname(node.content.uri);
                    const outputPath = path.join(outputDirectory, relativePath);
                    if(!fs.existsSync(outputPath)){
                        fs.mkdirSync(outputPath)
                    }
                    const b3dmUrl = new URL(node.content.uri, tilesetUrl).toString();
                    const b3dmFilename = path.basename(b3dmUrl);
                    const b3dmResponse = await axios.get(b3dmUrl, { responseType: 'arraybuffer' });
                    const outputFile = path.join(outputPath, b3dmFilename);
                    fs.writeFileSync(outputFile, Buffer.from(b3dmResponse.data));
                    console.log(`Downloaded: ${b3dmFilename}`);
                }
                if(node.content.uri.includes('.json')){
                    const jsonUrl = new URL(node.content.uri, tilesetUrl).toString();
                    await downloadB3dmFiles(jsonUrl, outputDirectory);
                }
            }
            if(node.children && node.children.length > 0){
                for (let i = 0; i < node.children.length; i++) {
                    await downloadNestedB3dmFiles(node.children[i], currentPath);
                }
            }

        }

        // 创建输出目录
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        // 开始下载b3dm文件
        await downloadNestedB3dmFiles(tilesetData.root, outputDirectory);
        console.log('Download completed.');
    } catch (error) {
        console.error('Error:', error);
    }
}

function getPathName(url){
    const pathname = new URL(url).pathname;
    const index = pathname.lastIndexOf('/');
    return (-1 !== index) ? pathname.substring(index + 1) : pathname;
}

// 示例用法
const tilesetUrl = 'http://ip:port/tileset.json';
const outputDirectory = 'b3dm_files';

// 调用函数下载b3dm文件
downloadB3dmFiles(tilesetUrl, outputDirectory);
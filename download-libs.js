const https = require('https');
const fs = require('fs');
const path = require('path');

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlinkSync(dest);
            reject(err);
        });
    });
};

const setup = async () => {
    if (!fs.existsSync('js')) fs.mkdirSync('js');
    
    console.log('Downloading Alpine.js...');
    await download('https://unpkg.com/alpinejs@3.13.3/dist/cdn.min.js', 'js/alpine.min.js');
    
    console.log('Downloading Chart.js...');
    await download('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js', 'js/chart.min.js');
    
    console.log('Done downloading js libraries.');
};

setup().catch(console.error);

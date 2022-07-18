import fs from 'fs';
import https from 'https';
import express from 'express';
import cors from 'cors';
import ytdl from 'ytdl-core';

// expires on 2022-10-13
const cert = fs.readFileSync('private/fullchain.pem');
const key = fs.readFileSync('private/privkey.pem');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true })); 
app.use(express.json());

app.get('/', (req, res) => {
    res.json(getLibrary());
});

// settings.json: "liveServer.settings.ignoreFiles":["music/**"]
app.post('/', async (req, res) => {
    const title = await getInfo(req.body.videoID);
    const folder = `music/${req.body.category}/${req.body.videoID}`;

    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder, { recursive: true });
    }

    const audio = ytdl(req.body.videoID, { filter: 'audioonly', quality: 'highestaudio' });
    //stream.on('info', (info, format) => console.log(info, format));
    audio.on('progress', (chunkLength, downloaded, total) => console.log("Progress:", Math.floor((downloaded / total) * 100)));
    audio.pipe(fs.createWriteStream(`${folder}/${title}.webm`).on('finish', () => console.log("done!")));
    
    const video = ytdl(req.body.videoID, { filter: 'videoandaudio', quality: 'lowestvideo' });
    //stream.on('info', (info, format) => console.log(info, format));
    video.on('progress', (chunkLength, downloaded, total) => console.log("Progress:", Math.floor((downloaded / total) * 100)));
    video.pipe(fs.createWriteStream(`${folder}/${title}.mp4`).on('finish', () => res.json(getLibrary())));
});

https.createServer({cert, key}, app).listen(432);

async function getInfo(videoID) {
    const info = await ytdl.getBasicInfo(videoID);
    return info.videoDetails.title;
}

function getLibrary() {
    const library = { THonly: [], Sisamuth: [], Anime: [], Pop: [], Foreign: [] };
    for (const category in library) {
        const categoryFolder = fs.opendirSync('music/' + category);
        let folders = true;
        while (folders) {
            const folder = categoryFolder.readSync();
            if (folder) {
                const songFolder = fs.opendirSync(`music/${category}/${folder.name}`);
                const song = songFolder.readSync();
                library[category].push(getData(songFolder.path, song.name));
                songFolder.close();
            }
            else folders = false;
        }
        categoryFolder.close();    
    }
    return library;
}

// https://stackoverflow.com/questions/10066638/get-youtube-information-via-json-for-single-video-not-feed-in-javascript
function getData(path, name) {
    const data = {};
    data.id = path.split('/')[2];
    data.title = name.replace('.webm', '');
    data.audio = `${path}/${data.title}.webm`;
    data.video = `${path}/${data.title}.mp4`;
    data.coverart = `https://i.ytimg.com/vi/${data.id}/maxresdefault.jpg`;
    data.thumbnail = `https://img.youtube.com/vi/${data.id}/3.jpg`;
    return data;
}
// console.log(getLibrary());

async function findFormat(videoID) {
    const info = await ytdl.getInfo(videoID);
    const format = ytdl.chooseFormat(info.formats, { filter: format => format.container === 'mp4', quality: 'lowestvideo' });
    console.log(format);
}
// findFormat('ZJfyq-L96Lk');
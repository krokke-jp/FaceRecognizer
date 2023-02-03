const { ipcRenderer } = require('electron');
const {dialog} = require('electron');
const tf = require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');
const fs = require('fs');
const video = document.getElementById('video')
const modelPath = './models';
const path = require('path');
const { throws } = require('assert');
const btn = document.getElementById('snap');


btn.addEventListener('click', async ()=>{

    btn.value = 'Take Photo';
})
Promise.all([
    faceapi.nets.ssdMobilenetv1.load(modelPath),
    faceapi.nets.faceLandmark68Net.load(modelPath),
    faceapi.nets.faceExpressionNet.load(modelPath),
    faceapi.nets.faceRecognitionNet.load(modelPath), //heavier/accurate version of tiny face detector
    console.log('models loaded')
])
function stop(){
    stream = video.srcObject;
    stream.getTracks().forEach(function(track) {
        track.stop();
      });

}
function start(trigger) {
    navigator.getUserMedia(
        { video:{} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
    if(trigger === 1){
        recognizeFaces();
    }
    if(trigger === 2){
        video.onplay = function (){
        takePhoto();
    }
};
}
function takePhoto(){

    if(video.playing){

        let canvas = faceapi.createCanvasFromMedia(video);
        canvas.getContext('2d').drawImage(video, 0, 0, 1, 600);
        photoData = canvas.toDataURL('image/jpg').replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        savePhoto("userdata/user/1.jpg");
    }
}
function savePhoto (filePath) {
    if (filePath) {
      fs.writeFile(filePath, photoData, 'base64', (err) => {
        if (err) alert(`There was a problem saving the photo: ${err.message}`);
        photoData = null;
      });
    }
  }


async function recognizeFaces() {

    const labeledDescriptors = await loadLabeledImages();
    console.log("labels set");
    console.log(labeledDescriptors);
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.7);


    video.addEventListener('play', async () => {
        console.log('Playing')
        let canvas = faceapi.createCanvasFromMedia(video);
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();

            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            const results = resizedDetections.map((d) => {
                return faceMatcher.findBestMatch(d.descriptor)
            })
            results.forEach( (result, i) => { 
                if((result.toString()).includes("user")){
                    ipcRenderer.send("userFound");
                    stop();
                }else{
                    ipcRenderer.send("unknown");
                }
            })
        }, 100)


        
    })
}
// check userbase for photos
function loadLabeledImages()  {
    const labels = ['user']; 
    return Promise.all(
        labels.map(async (label)=>{
            const descriptions = []
            const img = await faceapi.fetchImage(`./userdata/${label}/1.jpg`);
            try{
                    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                    descriptions.push(detections.descriptor)
                }catch(eror){
                    alert('please take a picture');
                    return;
                }
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    )
}
//check if webcam video is playing
Object.defineProperty(HTMLMediaElement.prototype, 'playing', {
    get: function(){
        return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 3);
    }
})
const tf = require('@tensorflow/tfjs');

tf.disableDeprecationWarnings();

require('@tensorflow/tfjs-node');
const NodeWebcam = require('node-webcam');
const Posenet = require('@tensorflow-models/posenet');
global.XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
const requestAnimationFrame = require('raf');
const { createCanvas, Image } = require('canvas');

const posenetConfiguration = {
  imageScaleFactor: 0.6,
  multiplier: 0.75,
  outputStride: 16,
  reversed: false,
};

const webcamConfiguration = {
  width: 1280,
  height: 720,
};

const canvas = createCanvas(webcamConfiguration.width, webcamConfiguration.height);
const ctx = canvas.getContext('2d');

let webcam = null;
let posenet = null;

const initWebcam = () => {
  return new Promise((resolve) => {
    webcam = NodeWebcam.create({
      width: webcamConfiguration.width,
      height: webcamConfiguration.height,
      output: 'jpeg',
      callbackReturn: 'base64',
    });
    console.log('Webcam resolved');
    resolve();
  });
};

const initModel = () => {
  return new Promise((resolve, reject) => {
    Posenet.load(posenetConfiguration.multiplier)
      .then((posenetModel) => {
        posenet = posenetModel;
        console.log('Posenet resolved');
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const getHand = (data) => {
  return new Promise((resolve, reject) => {
    posenet
      .estimateSinglePose(data, posenetConfiguration.imageScaleFactor, posenetConfiguration.reversed, posenetConfiguration.outputStride)
      .then((pose) => {
        const handKeyPoints = pose.keypoints.filter((item) => {
          return item.part === 'rightWrist' || item.part === 'leftWrist';
        });

        handKeyPoints.sort((a, b) => {
          return a.score > b.score ? 1 : -1;
        });

        resolve(this.getPartLocation(handKeyPoints[0]));
      })
      .catch((err) => {
        reject(err);
      });
  });
};

const loadImage = (base64) => {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      resolve(image);
    };
    image.onerror = (err) => {
      throw err;
    };

    image.src = base64;
  });
};

const render = () => {
  webcam.capture('webcam', (err, data) => {
    if (err) {
      console.error(err);
      return false;
    }

    loadImage(data).then((image) => {
      const tfImage = tf.browser.fromPixels(canvas, 3);

      getHand(tfImage).then((hand) => {
        console.log(hand.position);
        requestAnimationFrame(render());
      });
    });
  });
};

initWebcam()
  .then(() => initModel())
  .then(() => {
    render();
  })
  .catch((err) => {
    console.error(err);
  });

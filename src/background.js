/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import "babel-polyfill";
import * as tf from "@tensorflow/tfjs";
import { IMAGENET_CLASSES } from "./imagenet_classes";

// Where to load the model from.
const MOBILENET_MODEL_TFHUB_URL =
  "https://tfhub.dev/google/imagenet/mobilenet_v2_100_224/classification/2";
// Size of the image expected by mobilenet.
const IMAGE_SIZE = 224;
// The minimum image size to consider classifying.  Below this limit the
// extension will refuse to classify the image.
const MIN_IMG_SIZE = 128;

// How many predictions to take.
const TOPK_PREDICTIONS = 2;
const FIVE_SECONDS_IN_MS = 5000;

let count = 0;


function clickTestCallback(info, tab) {
  getTest(info.selectionText, tab.id);
}

function getTest(url, tabId) {
  if (!tabId) {
    console.error("No tab.  No prediction.");
    return;
  }
  const predictions = "Hello world";
  console.log(predictions);
  console.log(url);
  console.log(tabId);
  run([url]).then((res) => {
    console.log(res);
    let message = { action: "TEXT_CLICK_PROCESSED", url, predictions };
    chrome.tabs.sendMessage(tabId, message);
  });
}


chrome.contextMenus.create({
  title: "Classify political bias of text",
  contexts: ["selection"],
  onclick: clickTestCallback,
});

/**
 * Async loads a mobilenet on construction.  Subsequently handles
 * requests to classify images through the .analyzeImage API.
 * Successful requests will post a chrome message with
 * 'IMAGE_CLICK_PROCESSED' action, which the content.js can
 * hear and use to manipulate the DOM.
 */

class PoliticalClassifier {
  constructor() {
    this.loadModel()
    this.loadMetaData()

    return this
  }

  async loadModel() {
    console.log("Loading up political model");
    const startTime = performance.now();
    const url = `https://raw.githubusercontent.com/isengupt/PoliticalClassifier/master/model.json`;
    try {
      this.model = await tf.loadLayersModel(url);
   
    
      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Political model loaded and initialized in ${totalTime} ms...`);
 
    } catch {
      console.error(
        `Unable to load model from URL: ${url}`
      );
    }
  }

  async loadMetaData() {

    console.log("Retrieving metadata");
    const startTime = performance.now();
    try {
      let response = await fetch(
        "https://raw.githubusercontent.com/isengupt/PoliticalClassifier/master/metadata.json"
      )
      this.metadata = await response.json();
      console.log(this.metadata)
      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Word index metadata loaded in ${totalTime} ms...`);

    }
  catch {
    console.error(
      `Unable to retrieve from URL: ${url}`
    )
  }
}

padSequences = (sequences, metadata) => {
  const self = this
  return sequences.map((seq) => {
    if (seq.length > metadata.max_sentence_len) {
      seq.splice(0, seq.length - metadata.max_sentence_len);
    }
    if (seq.length < metadata.max_sentence_len) {
      const pad = [];
      for (let i = 0; i < metadata.max_sentence_len - seq.length; ++i) {
        pad.push(0);
      }
      seq = pad.concat(seq);
    }
    return seq;
  });
};

predict = (text, metadata, model) => {
  const self = this;
  console.log(trimmed);
  const trimmed = text
    .replace(",", " , ")
    .replace("!", " ! ")
    .replace(".", " . ")
    .split(" ");
  
  const sequence = trimmed.map((word) => {
    const wordIndex = metadata.words.indexOf(word);

    if (wordIndex === -1) {
      return 0; //oov_index
    }
    return wordIndex;
  });
  console.log([sequence]);
  const paddedSequence = padSequences([sequence], metadata);
  console.log(paddedSequence);
  const input = tf.tensor2d(paddedSequence, [1, metadata.max_sentence_len]);
  console.log(input);
  const predictOut = model.predict(input);
  const score = predictOut.dataSync()[0];
  predictOut.dispose();
  return score;
};

async run (text, className)  {
  const self = this;
  let sum = 0;
  text.forEach(function (prediction) {
    console.log(` ${prediction}`);
    let perc = self.predict(prediction, self.metadata, self.model);
    sum += parseFloat(perc, 10);
  });
  console.log(sum / text.length);
  ++count;
  chrome.runtime.sendMessage({
    msg: "count_update", 
    data: {
        content: count
    }
})

return Promise.resolve({ score: sum / text.length, text: text, className: className });
};
  


}

const politicalClassifier = new PoliticalClassifier();
/* class ImageClassifier {
  constructor() {
    this.loadModel();
  }


  async loadModel() {
    console.log("Loading model...");
    const startTime = performance.now();
    try {
      this.model = await tf.loadGraphModel(MOBILENET_MODEL_TFHUB_URL, {
        fromTFHub: true,
      });

      tf.tidy(() => {
        this.model.predict(tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
      });
      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Model loaded and initialized in ${totalTime} ms...`);
    } catch {
      console.error(
        `Unable to load model from URL: ${MOBILENET_MODEL_TFHUB_URL}`
      );
    }
  }

  async analyzeImage(url, tabId) {
    if (!tabId) {
      console.error("No tab.  No prediction.");
      return;
    }
    if (!this.model) {
      console.log("Waiting for model to load...");
      setTimeout(() => {
        this.analyzeImage(url);
      }, FIVE_SECONDS_IN_MS);
      return;
    }
    let message;
    this.loadImage(url).then(
      async (img) => {
        if (!img) {
          console.error(
            "Could not load image.  Either too small or unavailable."
          );
          return;
        }
        const predictions = await this.predict(img);
        message = { action: "IMAGE_CLICK_PROCESSED", url, predictions };
        chrome.tabs.sendMessage(tabId, message);
      },
      (reason) => {
        console.error(`Failed to analyze: ${reason}`);
      }
    );
  }


  async loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.onerror = function (e) {
        reject(`Could not load image from external source ${src}.`);
      };
      img.onload = function (e) {
        if (
          (img.height && img.height > MIN_IMG_SIZE) ||
          (img.width && img.width > MIN_IMG_SIZE)
        ) {
          img.width = IMAGE_SIZE;
          img.height = IMAGE_SIZE;
          resolve(img);
        }
       
        reject(
          `Image size too small. [${img.height} x ${img.width}] vs. minimum [${MIN_IMG_SIZE} x ${MIN_IMG_SIZE}]`
        );
      };
      img.src = src;
    });
  }

 
  async getTopKClasses(logits, topK) {
    const { values, indices } = tf.topk(logits, topK, true);
    const valuesArr = await values.data();
    const indicesArr = await indices.data();
    console.log(`indicesArr ${indicesArr}`);
    const topClassesAndProbs = [];
    for (let i = 0; i < topK; i++) {
      topClassesAndProbs.push({
        className: IMAGENET_CLASSES[indicesArr[i]],
        probability: valuesArr[i],
      });
    }
    return topClassesAndProbs;
  }

  async predict(imgElement) {
    console.log("Predicting...");

    const startTime1 = performance.now();
 
    let startTime2;
    const logits = tf.tidy(() => {
 
      const img = tf.browser.fromPixels(imgElement).toFloat();
 
      const normalized = img.div(tf.scalar(256.0));
      const batched = normalized.reshape([1, IMAGE_SIZE, IMAGE_SIZE, 3]);
      startTime2 = performance.now();
      const output = this.model.predict(batched);
      if (output.shape[output.shape.length - 1] === 1001) {
  
        return output.slice([0, 1], [-1, 1000]);
      } else if (output.shape[output.shape.length - 1] === 1000) {
        return output;
      } else {
        throw new Error("Unexpected shape...");
      }
    });

 
    const classes = await this.getTopKClasses(logits, TOPK_PREDICTIONS);
    const totalTime1 = performance.now() - startTime1;
    const totalTime2 = performance.now() - startTime2;
    console.log(
      `Done in ${totalTime1.toFixed(1)} ms ` +
        `(not including preprocessing: ${Math.floor(totalTime2)} ms)`
    );
    return classes;
  }
}

const imageClassifier = new ImageClassifier(); */

const getMetaData = async () => {
  const metadata = await fetch(
    "https://raw.githubusercontent.com/isengupt/PoliticalClassifier/master/metadata.json"
  );
  return metadata.json();
};

const loadModel = async () => {
  const url = `https://raw.githubusercontent.com/isengupt/PoliticalClassifier/master/model.json`;
  const model = await tf.loadLayersModel(url);
  return model;
};

const padSequences = (sequences, metadata) => {
  return sequences.map((seq) => {
    if (seq.length > metadata.max_sentence_len) {
      seq.splice(0, seq.length - metadata.max_sentence_len);
    }
    if (seq.length < metadata.max_sentence_len) {
      const pad = [];
      for (let i = 0; i < metadata.max_sentence_len - seq.length; ++i) {
        pad.push(0);
      }
      seq = pad.concat(seq);
    }
    return seq;
  });
};

const predict = (text, model, metadata) => {
  console.log(trimmed);
  const trimmed = text
    .replace(",", " , ")
    .replace("!", " ! ")
    .replace(".", " . ")
    .split(" ");
  console.log(trimmed);
  const sequence = trimmed.map((word) => {
    const wordIndex = metadata.words.indexOf(word);

    if (wordIndex === -1) {
      return 0; //oov_index
    }
    return wordIndex;
  });
  console.log([sequence]);
  const paddedSequence = padSequences([sequence], metadata);
  console.log(paddedSequence);
  const input = tf.tensor2d(paddedSequence, [1, metadata.max_sentence_len]);
  console.log(input);
  const predictOut = model.predict(input);
  const score = predictOut.dataSync()[0];
  predictOut.dispose();
  return score;
};

const run = async (text, className) => {
  const model = await loadModel();
  const metadata = await getMetaData();
  let sum = 0;
  text.forEach(function (prediction) {
    console.log(` ${prediction}`);
    let perc = predict(prediction, model, metadata);
    sum += parseFloat(perc, 10);
  });
  console.log(sum / text.length);
  ++count;
  chrome.runtime.sendMessage({
    msg: "count_update", 
    data: {
        content: count
    }
})

  return Promise.resolve({ score: sum / text.length, text: text, className: className });
};

/* chrome.browserAction.onClicked.addListener(function (tab) {
  // ...check the URL of the active tab against our pattern and...
  if (tab.url) {
    console.log(tab.id)
      // ...if it matches, send a message specifying a callback too
      chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, doStuffWithDom);
  }
}); */

/* chrome.runtime.onMessage.addListener(function (tab, message) {
  if (message.text == "report_back") {
    console.log(message)
    chrome.tabs.sendMessage(tab.id, { text: "report_back" }, doStuffWithDom);
  }
}); */

function doStuffWithDom(...args) {
  console.log(args[0])
  console.log(args);
  //console.log('do stuff with dom')

  const getData = async () => {
    return Promise.all(
      args[0].map((item) => politicalClassifier.run([item.text], item.className))
    );
  };
  count = 0;
  getData().then((data) => {
    console.log(data);

    chrome.tabs.query({ active: true }, function (tabs) {
      console.log(tabs[tabs.length - 1]);
      let message = { action: "PROCESS_FINISHED", data };
      chrome.tabs.sendMessage(tabs[tabs.length - 1].id, message);
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.foo === "bar") {
    console.log("ehllo");
    console.log(msg);

    chrome.tabs.query({ active: true }, function (tabs) {
      console.log(tabs);
      chrome.tabs.sendMessage(tabs[tabs.length - 1].id, { text: "report_back" }, doStuffWithDom);
    });

    return true;
    // chrome.tabs.sendMessage(tab.id, {text: 'report_back'}, doStuffWithDom);
  }
});


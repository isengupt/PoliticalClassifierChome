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

// class name for all text nodes added by this script.
const TEXT_DIV_CLASSNAME = 'tfjs_mobilenet_extension_text';
// Thresholds for LOW_CONFIDENCE_THRESHOLD and HIGH_CONFIDENCE_THRESHOLD,
// controlling which messages are printed.
const HIGH_CONFIDENCE_THRESHOLD = 0.5;
const LOW_CONFIDENCE_THRESHOLD = 0.1;

const HIGH_DEMOCRAT_SCORE = 0.9;
const HIGH_REPUBLICAN_SCORE = 0.1;
const MID_DEMOCRAT_SCORE = 0.6;
const MID_REPUBLICAN_SCORE = 0.4;

let filterArr = [];

function colorPicker(score) {
  if (score > HIGH_DEMOCRAT_SCORE) {
    return {color: '#rgba(0,0,255,1)'}
  }
  else if (score > MID_DEMOCRAT_SCORE && score < HIGH_DEMOCRAT_SCORE) {
    return {color: '#5252ff'}
  }
  else if (score > 0.5 && score < MID_DEMOCRAT_SCORE ) {
    return {color: '#a1a1ff'}
  }
  else if (score > MID_REPUBLICAN_SCORE && score < 0.5) {
    return {color: '#ffc7c7'}
  }
  else if (score > HIGH_REPUBLICAN_SCORE && score < MID_REPUBLICAN_SCORE) {
    return {color: '#ff4747'}
  }
  else {
    return {color: '#rgba(255, 0,0,1)'}
  }

}

function slideFilter(score) {
  var filteredArr = filterArr.reduce(
    (s, x) => {
      s[x.score > score].push(x);
      return s;
    },
    {true: [], false: []},
  );
  console.log(filteredArr['true'])
  filteredArr['true'].map((article) => {
    for (const element of document.body.getElementsByClassName(article.className)) {
     // console.log(element)
      if (element.textContent == article.text[0]) {
        console.log(element)
        //element.style.display = 'block'
      }
    }
  })
  console.log(filteredArr['false'])
  filteredArr['true'].map((article) => {
    for (const element of document.body.getElementsByClassName(article.className)) {
     // console.log(element)
      if (element.textContent == article.text[0]) {
        console.log(element)
        //element.style.display = 'none'
      }
    }
  })
}


/**
 * Produces a short text string summarizing the prediction
 * Input prediction should be a list of {className: string, prediction: float}
 * objects.
 * @param {[{className: string, predictions: number}]} predictions ordered list
 *     of objects, each with a prediction class and score
 */
function textContentFromPrediction(predictions) {
  if (!predictions || predictions.length < 1) {
    return `No prediction 🙁`;
  }
  // Confident.
  if (predictions[0].probability >= HIGH_CONFIDENCE_THRESHOLD) {
    return `😄 ${predictions[0].className}!`;
  }
  // Not Confident.
  if (predictions[0].probability >= LOW_CONFIDENCE_THRESHOLD &&
      predictions[0].probability < HIGH_CONFIDENCE_THRESHOLD) {
    return `${predictions[0].className}?...\n Maybe ${
        predictions[1].className}?`;
  }
  // Very not confident.
  if (predictions[0].probability < LOW_CONFIDENCE_THRESHOLD) {
    return `😕  ${predictions[0].className}????...\n Maybe ${
        predictions[1].className}????`;
  }
}



/**
 *  Returns a list of all DOM image elements pointing to the provided srcUrl.
 * @param {string} srcUrl which url to search for, including 'http(s)://'
 *     prefix.
 * @returns {HTMLElement[]} all img elements pointing to the provided srcUrl
 */
function getImageElementsWithSrcUrl(srcUrl) {
  const imgElArr = Array.from(document.getElementsByTagName('img'));
  const filtImgElArr = imgElArr.filter(x => x.src === srcUrl);
  return filtImgElArr;
}
function getElementsByTextUrl(textUrl) {
  const imgElArr = Array.from(document.getElementsByTagName('p'));
  const filtImgElArr = imgElArr.filter(x => x.src === srcUrl);
  return filtImgElArr;
}

/**
 * Finds and removes all of the text predictions added by this extension, and
 * removes them from the DOM. Note: This does not undo the containerization.  A
 * cleaner implementation would move the image node back out of the container
 * div.
 */
function removeTextElements() {
  const textDivs = document.getElementsByClassName(TEXT_DIV_CLASSNAME);
  for (const div of textDivs) {
    div.parentNode.removeChild(div);
  }
}



/**
 *  Moves the provided imgNode into a container div, and adds a text div as a
 * peer.  Styles the container div and text div to place the text
 * on top of the image.
 * @param {HTMLElement} imgNode Which image node to write content on.
 * @param {string} textContent What text to write on the image.
 */
function addTextElementToImageNode(imgNode, textContent) {
  const originalParent = imgNode.parentElement;
  const container = document.createElement('div');
  container.style.position = 'relative';
  container.style.textAlign = 'center';
  container.style.colore = 'white';
  const text = document.createElement('div');
  text.className = 'tfjs_mobilenet_extension_text';
  text.style.position = 'absolute';
  text.style.top = '50%';
  text.style.left = '50%';
  text.style.transform = 'translate(-50%, -50%)';
  text.style.fontSize = '34px';
  text.style.fontFamily = 'Google Sans,sans-serif';
  text.style.fontWeight = '700';
  text.style.color = 'white';
  text.style.lineHeight = '1em';
  text.style['-webkit-text-fill-color'] = 'white';
  text.style['-webkit-text-stroke-width'] = '1px';
  text.style['-webkit-text-stroke-color'] = 'black';
  // Add the containerNode as a peer to the image, right next to the image.
  originalParent.insertBefore(container, imgNode);
  // Move the imageNode to inside the containerNode;
  container.appendChild(imgNode);
  // Add the text node right after the image node;
  container.appendChild(text);
  text.textContent = textContent;
}



// Add a listener to hear from the content.js page when the image is through
// processing.  The message should contin an action, a url, and predictions (the
// output of the classifier)
//
// message: {action, url, predictions}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'IMAGE_CLICK_PROCESSED' && message.url &&
      message.predictions) {
    // Get the list of images with this srcUrl.
    const imgElements = getImageElementsWithSrcUrl(message.url);
    for (const imgNode of imgElements) {
      const textContent = textContentFromPrediction(message.predictions);
      addTextElementToImageNode(imgNode, textContent);

    }
  } else if (message && message.action == "TEXT_CLICK_PROCESSED") {
    console.log(message);
    const textContent = message.predictions;

  } else if (message.action === 'PROCESS_FINISHED') {
    console.log(message)
    let edit = [];
    
    message.data.map((item) => {
      filterArr.push(item)

      for (const element of document.body.getElementsByClassName(item.className)) {
        if (element.textContent == String(item.text)) {
          console.log(element.parentElement.parentElement.parentElement)
  
          edit.push(String(item.text).substring(0,50))
          
          const textColor = colorPicker(item.score)
          element.color = 'white'
          element.parentElement.style.backgroundColor = textColor.color
          element.parentElement.parentElement.style.backgroundColor = textColor.color
          element.parentElement.parentElement.parentElement.style.backgroundColor = textColor.color
          element.parentElement.parentElement.parentElement.parentElement.style.backgroundColor = textColor.color
          element.parentElement.parentElement.parentElement.parentElement.parentElement.style.backgroundColor = textColor.color
          element.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.style.backgroundColor = textColor.color
          element.style.backgroundColor = textColor.color;
          const score = document.createElement('div')
          score.textContent = 'Score: ' + String(item.score)
          score.className = 'political_classifier_score'
/*           score.style.position = 'absolute';
          score.style.top = '50%';
          score.style.left = '50%';
          score.style.transform = 'translate(-50%, -50%)'; */
          score.style.fontSize = '18px';

          score.style.fontFamily = 'Google Sans,sans-serif';
          score.style.fontWeight = '600';
          element.appendChild(score)

        }
      }
   
    })
  } else if (message.action === "SLIDER_VALUE") {
    console.log(message)
    slideFilter(message.value)
  } else if (message && message.text === "report_back") {
    const timeLine = document.body.getElementsByTagName("div")

    //console.log(timeLine)
    const posts =  document.body.getElementsByClassName('Post')
    //console.log("All posts", posts)


    let childItems = []
    let childTexts = []
    for (const element of timeLine[0].getElementsByTagName("*")) {
      if (element.textContent.length < 20) {
        continue;
      }
      else if (childTexts.includes(String(element.textContent).substring(0,50))) {
        //console.log(element)
        continue;
      }
      
      else {
        if (element.className && element.textContent) {
          childTexts.push(String(element.textContent).substring(0,50))
         // childItems.push({text: element.textContent, className: element.className})
        }
        else {
          continue;
        }
        
    
      }
    
    
    }
    for (const element of posts) {
      for (const item of element.getElementsByTagName("h3")) {
        console.log(item.className)
        console.log(item.innerText)
     
        childItems.push({text: item.innerText, className: item.className})
      }
    }
console.log(childItems)
    sendResponse(childItems)
  }
});

function isEquivalent(a, b) {
  // Create arrays of property names
  var aProps = Object.getOwnPropertyNames(a);
  var bProps = Object.getOwnPropertyNames(b);

  // If number of properties is different,
  // objects are not equivalent
  if (aProps.length != bProps.length) {
      return false;
  }

  for (var i = 0; i < aProps.length; i++) {
      var propName = aProps[i];

      // If values of same property are not equal,
      // objects are not equivalent
      if (a[propName] !== b[propName]) {
          return false;
      }
  }

  // If we made it this far, objects
  // are considered equivalent
  return true;
}

/* window.addEventListener('click', clickHandler, false);

function clickHandler(mouseEvent) {
  if (mouseEvent.button == 0) {
    removeTextElements();
  }
}
function getObjectChildren(elem) {
  var elemChildren = elem.childNodes;
  var result = [];
  for (var k = 0; k < elemChildren.length; k++) {
      result.push(elemChildren[k]);
      if (elemChildren[k].childNodes.length > 0) {
          var tmp = getObjectChildren(elemChildren[k]);
          for (var i = 0; i < tmp.length; i++) {
              result.push(tmp[i]);
          }
      }
  }
  return result;
} */
/* chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  // If the received message has the expected format...
  if (msg.text === 'report_back') {
console.log("hello")
    const timeLine = document.body.getElementsByTagName("main")

console.log(timeLine)

let childTexts = []
for (const element of timeLine[0].getElementsByTagName("*")) {
  if (element.textContent.length < 150) {
    continue;
  }
  else if (childTexts.includes({text: element.textContent, class: element.className})) {
    continue;
  }
  else {
    if (element.className && element.textContent) {
      console.log(element.className)
      console.log(element.textContent)
      childTexts.push({text: element.textContent, className: element.className})
    }
    else {
      continue;
    }
    

  }


}

sendResponse(childTexts);


  } 
}); */




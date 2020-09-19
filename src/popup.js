const slider = document.getElementById("slider");

slider.addEventListener("change", (e) => {
  console.log(e.target.value);

  const params = {
    active: true,
  };
  chrome.tabs.query(params, (tabs) => {
    console.log(tabs);
    const message = { action: "SLIDER_VALUE", value: e.target.value };
    chrome.tabs.sendMessage(tabs[tabs.length - 1].id, message);
  });
});

const dataButton = document.getElementById("getData");

dataButton.addEventListener("click", function () {
  console.log("hello");
  chrome.runtime.sendMessage({ foo: "bar" });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.msg === "count_update") {
    console.log(request.data.content);
    move(request.data.content);
  }
});

function move(count) {
  var elem = document.getElementById("barStatus");
  var counter = document.getElementById("count");
  counter.textContent = String(count);
  elem.style.width = count + "%";
}
    
  



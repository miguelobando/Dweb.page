"use strict";
import MIME from "mime/lite";
import "fast-text-encoding";
import "./alert";
import "./url-parameters";
import "./jquery/jquery";
import { Log } from "./services/Log";
import { Encryption } from "./services/Encryption";
import { saveAs } from "./file-saver";
import Ping from "./services/Ping.js";
import "../css/style.css";
import "../css/alert.css";

const HOST = window.location.hostname;
const PROTOCOL = window.location.protocol;
let gateway = "http://localhost:8080/ipfs/";

/**
 *
 * @param {string} msg
 */
function output(msg) {
  let m = document.getElementById("messages");
  m.innerHTML = msg;
}

function downloadFile(fileId, fileName, blob, isEncrypted) {
  var p = new Ping();
  p.ping(function(err, data) {
    if (err) {
      output("Something is blocking the log entry!");
    }
    console.log(data);
    new Log().createLog(fileId, fileName, false, gateway, isEncrypted);
    saveAs(blob, fileName);
  });
}

function progressBar(percent) {
  let elem = document.getElementById("loadBar");
  elem.style.width = percent + "%";
  if (percent >= 100) {
    document.getElementById("loadProgress").style.display = "none";
  }
}

function load() {
  let password = document.getElementById("passwordField").value;
  let fileId = document.getElementById("firstField").value;
  if (fileId.length != 46) {
    output("You have entered an invalid filename!");
  } else if (password.length != 43 && password !== "nopass") {
    output("You have entered an invalid password!");
  } else {
    if (!/^[a-zA-Z0-9_.-]*$/.test(password)) {
      output("You have entered an invalid password!");
    } else if (!/^[a-zA-Z0-9]*$/.test(fileId)) {
      output("You have entered an invalid filename!");
    } else {
      output("");
      var oReq = new XMLHttpRequest();
      document.getElementById("response").classList.remove("hidden");
      oReq.onloadstart = function(e) {
        document.getElementById("loadProgress").style.display = "block";
      };
      oReq.onload = function(oEvent) {
        const arrayBuffer = oReq.response;
        const fileNameLength =
          new TextDecoder("utf-8").decode(arrayBuffer.slice(0, 4)) - 1000;
        const fileName = new TextDecoder("utf-8").decode(
          arrayBuffer.slice(4, fileNameLength + 4)
        );
        // encrypted
        if (password !== "nopass") {
          let initialVector = new Uint8Array(
            arrayBuffer.slice(4 + fileNameLength, 16 + fileNameLength)
          );
          const fileArray = new Uint8Array(
            arrayBuffer.slice(16 + fileNameLength)
          );
          const enc = new Encryption();
          const keyPromise = enc.importKey(password);
          keyPromise
            .then(function(key) {
              const decryptPromise = enc.decrypt(initialVector, key, fileArray);
              decryptPromise
                .then(function(decrypted) {
                  let typeM = MIME.getType(fileName);
                  const blob = new Blob([decrypted], { type: typeM });
                  blob.name = fileName;
                  downloadFile(fileId, fileName, blob, true);
                })
                .catch(function(err) {
                  output("You have entered an invalid password!");
                });
            })
            .catch(function(err) {
              output("You have entered an invalid password!");
            });
        } else {
          const fileArray = new Uint8Array(
            arrayBuffer.slice(4 + fileNameLength)
          );
          let typeM = MIME.getType(fileName);
          const blob = new Blob([fileArray], { type: typeM });
          blob.name = fileName;
          downloadFile(fileId, fileName, blob, false);
        }
      };
      oReq.onprogress = function(e) {
        if (e.lengthComputable) {
          let per = Math.round((e.loaded * 100) / e.total);
          progressBar(per);
        }
      };
      oReq.onreadystatechange = function(oEvent) {
        // Ready State 4 = operation completed
        if (oReq.readyState === 4) {
          if (oReq.status !== 200) {
            output("You have entered an invalid filename!");
          }
        }
      };

      if (HOST != "localhost" && HOST != "127.0.0.1") {
        gateway = PROTOCOL + "//" + HOST + "/ipfs/";
      }

      oReq.open("GET", gateway + fileId, true);
      oReq.responseType = "arraybuffer";
      oReq.send();
    }
  }
}

document
  .getElementById("passwordField")
  .addEventListener("keyup", function(event) {
    event.preventDefault();
    if (event.keyCode === 13) {
      document.getElementById("load").click();
    }
  });

document.addEventListener("DOMContentLoaded", function() {
  document.getElementById("load").onclick = load;
});

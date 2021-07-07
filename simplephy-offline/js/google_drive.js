var selecting_folder = 0;
var folder_ids = [];
var loading = false;
$(document).ready(function () {
  $("#google-drive-select").click(function () {
    $("#google-drive-dialog").show();
    $(".background").css("filter", "blur(4px)");
    $("body").css({ overflow: 'hidden' });
    $(".background").css("opacity", ".4");
    //$("#google-drive-dialog")
  });
  $("#google-drive-submit").click(function () {
    folder_ids = [];
    $("#google-drive-result").html('<i class="fas fa-hourglass fa-spin"></i>');
    $.getJSON(directoryPath + "php/getFiles.php", { "drive-folder-id": $("#google-drive-url").val() })
      .done(function (data) {
          if("error" in data){
              $("#google-drive-result").html("<div class='error'>An error ocurred: "+data["error"]+"</div>");
          }else{
            var html = "<h2>Select the folder for condition #1</h2><ul>";
            for (f = 0; f < data.length; f++) {
              html += "<li google-folder-id=" + data[f].id + ">" + data[f].name + "<span class='files-found'></span></li>";
            }
            html += "</ul>"
            //console.log(html);
            selecting_folder = 1;
            $("#google-drive-result").html(html);
        }
      })
      .fail(function (data) {
        $("#google-drive-result").html("<div class='error'>The folder is not public or does not exist, please check that it is made public and try again</div>");
      });
  });
  $('body').on('click', "#google-drive-result ul li", function (e) {
    if (selecting_folder != 0 && !loading) {
      selecting_folder++;
      $("#google-drive-result h2").html("Select the folder for condition #" + selecting_folder);

      var thisElement = $(this);
      var folderName = thisElement.text();

      $.getJSON(directoryPath + "php/getFiles.php", { "drive-folder-id": thisElement.attr("google-folder-id") })
        .done(function (data) {
          //console.log(data.length,data);
          //thisElement.children(".files-found").html();

          folder_ids.push({
            name: folderName,
            id: thisElement.attr("google-folder-id"),
            stimuli: { infoFiles: [], feedbackFiles: [], stimulusFiles: [] }
          });
          //thisElement.css("background-color","green");
          loading = true;
          getStimuli(data, folder_ids.length - 1, thisElement);
          loading = false;
        });
      thisElement.children(".files-found").html('<i class="fas fa-hourglass fa-spin"></i>&nbsp;&nbsp;&nbsp;<span> Loading...</span>')
      thisElement.css("background-color", "#004400");
    }
  });
  $("#google-drive-dialog .button").click(function () {
    cancelPopup(null);
    arr.config.conditions = folder_ids;
    var count = 0;
    for (i = 0; i < arr.config.conditions.length; i++)
      count += arr.config.conditions[i].stimuli.stimulusFiles.length;
    $("#create-experiment").removeClass("disabled");
  });
});

function getStimuli(data, id, thisElement) {
  for (i = 0; i < data.length; i++) {
    setTimeout(function (i) {
      $.getJSON(directoryPath + "php/getFiles.php", { "drive-file-id": data[i].id })
        .done(function (dataIn) {
          stimulusImages = [];
          for (j = 0; j < dataIn.length; j++) {
            if (dataIn[j].name.includes(".json"))
              folder_ids[id].stimuli.infoFiles[i] = dataIn[j];
            else if (dataIn[j].name.includes("feedback"))
              folder_ids[id].stimuli.feedbackFiles[i] = dataIn[j];
            else
              stimulusImages.push(dataIn[j]);
          }
          folder_ids[id].stimuli.stimulusFiles[i] = stimulusImages;
          if (folder_ids[id].stimuli.stimulusFiles.length < data.length) {
            thisElement.children(".files-found").children("span").html(parseInt(100 * folder_ids[id].stimuli.stimulusFiles.filter(Boolean).length / data.length) + " %");
          } else {
            thisElement.children(".files-found").html('<i class="fas fa-check-square"></i>&nbsp;&nbsp;&nbsp;' + data.length + " stimuli found");
            thisElement.css("background-color", "green");
          }
        })
        .fail(function () {
          thisElement.children(".files-found").html("<span class='error'>Error loading trials</span>");
          folder_ids = [];
        });
    }, i * 111, i);
  }
}

function loadTrialGoogleDrive(stimuli, list, feedback, MAFC) {

  for (i = 0; i < list.length; i++) {
    if (list[i].name.includes("mp4") || list[i].name.includes("webm")) {
      stimuli.img[i] = document.createElement("video");
      stimuli.img[i].autoplay = true;
      //stimuli.img[i].setAttribute("controls","controls");
      stimuli.img[i].onloadeddata = function () {
        moveLoadingBar(loaded, list.length);
      };
    } else {
      stimuli.img[i] = new Image();
      stimuli.img[i].stimId = i;
      stimuli.img[i].stimMax = list.length;
    }
    stimuli.img[i].setAttribute("class", "stimulus-img");
    stimuli.img[i].setAttribute("numImg", i + 1);
    if ($("#stimulus").hasClass("circle")) {
      stimuli.img[i].setAttribute("style", "left:calc(50% + " + (Math.cos(i * angle * Math.PI / 180) * MAFCdistance) + "em);top:calc(50% + " + (Math.sin(i * angle * Math.PI / 180) * MAFCdistance) + "em)");
    }

    stimuli.img[i].onload = function () {
      loaded++;
      if (loaded == list.length && loading) {
        $("#loading-bar").hide();
        $("#trial-container").css("display", "table");
        $("#loading-bar-progress").css("width", "0%")
        $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / list.length + "%");
        window.scrollTo(0, 0);

        if ($("#stimulus").hasClass("circle")) {
          sel = document.querySelectorAll(".stimulus-img");
          $(".stimulus-img").css("margin-left", "-" + sel[0].width / 2 + "px");
          $(".stimulus-img").css("margin-top", "-" + sel[0].width / 2 + "px");
          /*for(i=0;i<sel.length;i++){
              $(sel[i]).css("margin-left","-"+sel[i].width/2+"px");
              $(sel[i]).css("margin-top","-"+sel[i].height/2+"px");
          }*/
        }
        getDisplayParameters();
        stimulusOn = Date.now();
        if (arr.config.options.timeout[currentSlice] > 0 && loading && !("text" in stimuli.info)) {
          //console.log("set timeout", stimuli.info);
          timeout = setTimeout(
            showResponse,
            arr.config.options.timeout[currentSlice],
            arr.config.options.ratings,
            arr.continueFrom + 1
          );
        }
        running = true; loading = false;
      }
      else
        $("#loading-bar-progress").css("width", (100 * (loaded + 1) / list.length) + "%");
    }
    stimuli.img[i].onerror = function () {
      //alert("Error loading stimuli, please reload the page and contact us");
      //throw new Error("Something went badly wrong!");
      //resetExperiment(1, calibrating, animCalibration,"There was an error loading the trial, please try again. <br>If this keeps happening, try again later. Alternatively, you can also log in with your Google account, a new button will show up next to the Start button.");
      resetExperiment(1, calibrating, animCalibration, "There was an error loading the trial, please try again.");
      //$("#google-login").removeClass("hidden");
    }
    //stimuli.img[i].src = "https://drive.google.com/uc?export=view&id="+list[i].id;

    setTimeout(function (i) {
      //stimuli.img[i].src="https://www.googleapis.com/drive/v3/files/"+list[i].id+"?key=XXX&alt=media";
      if (gapi.auth2!== undefined && gapi.auth2.getAuthInstance().isSignedIn.get()) {
        stimuli.img[i].src = directoryPath + "php/getStimuli.php?file-id=" + list[i].id + "&name=" + list[i].name + "&token=" + gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
      } else {
        /*  r=Math.random();
        if(r<0.2)*/
        stimuli.img[i].src = "https://drive.google.com/uc?export=view&id=" + list[i].id;
        /*else
          stimuli.img[i].src="https://error/"+list[i].id;*/
      }
    }, i * 200, i);

    if (MAFC) {
      $("#stimulus").append(stimuli.img[i]);
    }
  }
  if (MAFC) {
    stimuli.slices = 1;
    $("#stimulus").randomize(".stimulus-img");
  } else {
    stimuli.slices = list.length;
    numSlices = list.length;
    $("#stimulus .stimulus-img").replaceWith(stimuli.img[0]);

  }



  if (feedback) {
    if (feedback.name.includes("mp4") || feedback.name.includes("webm")) {
      stimuli.feedback = document.createElement("video");
      stimuli.feedback.autoplay = true;
    } else {
      stimuli.feedback = new Image();
      stimuli.feedback.stimId = "feedback";
    }
    stimuli.feedback.setAttribute("class", "stimulus-img");
    stimuli.feedback.setAttribute("numImg", "feedback");
    stimuli.feedback.onload = function () {

    }
    stimuli.feedback.src = "https://drive.google.com/uc?export=view&id=" + feedback.id;
    //stimuli.feedback.src = "/php/getStimuli.php?file-id="+feedback.id+"&name="+feedback.name;
  } else {
    stimuli.feedback = null;
  }

  if (stimuli.slices > 1 && arr.config.options.multiple != "first") {
    $("#stimulus-scroll-bar").show();
    $("#stimulus-slice").show();
  } else {
    $("#stimulus-scroll-bar").hide();
    $("#stimulus-slice").hide();
  }
}


function loadTrialLocal(stimuli, list, feedback, MAFC) {

  for (i = 0; i < list.length; i++) {
    if (list[i].name.includes("mp4") || list[i].name.includes("webm")) {
      stimuli.img[i] = document.createElement("video");
      stimuli.img[i].autoplay = true;
      //stimuli.img[i].setAttribute("controls","controls");
      stimuli.img[i].onloadeddata = function () {
        moveLoadingBar(loaded, list.length);
      };
    } else {
      stimuli.img[i] = new Image();
      stimuli.img[i].stimId = i;
      stimuli.img[i].stimMax = list.length;
    }
    stimuli.img[i].setAttribute("class", "stimulus-img");
    stimuli.img[i].setAttribute("numImg", i + 1);
    if ($("#stimulus").hasClass("circle")) {
      stimuli.img[i].setAttribute("style", "left:calc(50% + " + (Math.cos(i * angle * Math.PI / 180) * MAFCdistance) + "em);top:calc(50% + " + (Math.sin(i * angle * Math.PI / 180) * MAFCdistance) + "em)");
    }

    stimuli.img[i].onload = function () {
      loaded++;
      if (loaded == list.length && loading) {
        $("#loading-bar").hide();
        $("#trial-container").css("display", "table");
        $("#loading-bar-progress").css("width", "0%")
        $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / list.length + "%");
        window.scrollTo(0, 0);

        if ($("#stimulus").hasClass("circle")) {
          sel = document.querySelectorAll(".stimulus-img");
          $(".stimulus-img").css("margin-left", "-" + sel[0].width / 2 + "px");
          $(".stimulus-img").css("margin-top", "-" + sel[0].width / 2 + "px");
          /*for(i=0;i<sel.length;i++){
              $(sel[i]).css("margin-left","-"+sel[i].width/2+"px");
              $(sel[i]).css("margin-top","-"+sel[i].height/2+"px");
          }*/
        }
        getDisplayParameters();
        stimulusOn = Date.now();
        if (arr.config.options.timeout[currentSlice] > 0 && loading && !("text" in stimuli.info)) {
          //console.log("set timeout", stimuli.info);
          timeout = setTimeout(
            showResponse,
            arr.config.options.timeout[currentSlice],
            arr.config.options.ratings,
            arr.continueFrom + 1
          );
        }
        running = true; loading = false;
      }
      else
        $("#loading-bar-progress").css("width", (100 * (loaded + 1) / list.length) + "%");
    }
    stimuli.img[i].onerror = function () {
      resetExperiment(1, calibrating, animCalibration, "There was an error loading the trial, please try again.");
    }
    reader = new FileReader();
    reader.name = list[i].name
    reader.readAsDataURL(localStimuli[reader.name]);

    reader.img = stimuli.img;
    reader.idx = i
    reader.addEventListener("loadend", function (evt) {
      // convert image file to base64 string
      this.img[this.idx].src = evt.target.result;
    }, false);

    if (MAFC) {
      $("#stimulus").append(stimuli.img[i]);
    }
  }
  if (MAFC) {
    stimuli.slices = 1;
    $("#stimulus").randomize(".stimulus-img");
  } else {
    stimuli.slices = list.length;
    numSlices = list.length;
    $("#stimulus .stimulus-img").replaceWith(stimuli.img[0]);
  }

  if (feedback.length > 0) {
    if (feedback.name.includes("mp4") || feedback.name.includes("webm")) {
      stimuli.feedback = document.createElement("video");
      stimuli.feedback.autoplay = true;
    } else {
      stimuli.feedback = new Image();
      stimuli.feedback.stimId = "feedback";
    }
    stimuli.feedback.setAttribute("class", "stimulus-img");
    stimuli.feedback.setAttribute("numImg", "feedback");
    stimuli.feedback.onload = function () {

    }
    stimuli.feedback.src = arr.config.options.localFolder + "/" + feedback.name;
    //stimuli.feedback.src = "/php/getStimuli.php?file-id="+feedback.id+"&name="+feedback.name;
  } else {
    stimuli.feedback = null;
  }

  if (stimuli.slices > 1 && arr.config.options.multiple != "first") {
    $("#stimulus-scroll-bar").show();
    $("#stimulus-slice").show();
  } else {
    $("#stimulus-scroll-bar").hide();
    $("#stimulus-slice").hide();
  }
}

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  $.getJSON("/credentials/client_id.psyphy", function (data) {
    var CLIENT_ID = data["client_id"];
    var API_KEY = data["api_key"];
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES
    }).then(function () {
      // Listen for sign-in state changes.
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

      // Handle the initial sign-in state.
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    }, function (error) {
    });
  });

}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    $("#google-login").removeClass("hidden");
    $("#authorize_button").hide();
    $("#signout_button").show();
  } else {
    $("#authorize_button").show();
    $("#signout_button").hide();
  }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

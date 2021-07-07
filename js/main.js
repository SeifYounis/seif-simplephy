
var version = "1.13.0";

var md = new MobileDetect(window.navigator.userAgent);

var count = 0;
var arr = { name: "", config: { options: {} }, data: [] };
var stimuli = null;
var calibrated = false;
var calibrating = false;
var animCalibration = -1;
var blindSpotDistance = [];
var blindSpotDegrees = 13; //13.59 
var running = false;
var loading = false;
var responding = false;
var pressedKey = [];
var allowedKeys = [];
var loaded = 0;
var preparation = false;
var showingFeedback = false;
var loadingInfo = false;
var resumingExperiment = false;
var generatingKeys = false;
var localExperiment = false;
var localFileList = null;
var localStimuli = {};
var all_conditions = {};

var display = null;

var stimulusOn = -1;
var stimulusOff = null;
var currentSlice = 0;

var timeout = false;
var trialSequence = null;
var trialID = 1;
var marks = [];
var scrolling = [];
var fixationGrid = [];
var playPause = [];
var numSlices = 100;
var cheatCode = false;
var cookieName = "";

var markColors = ["white", "lime", "red", "blue"];

var testExperimentID = "863d24f0-1360-47b1-bb2d-d43ac905818d"; //4AFC

var googleClient = null;
var googleToken = null;

var server = null;
var rewrite=false;

//console.log(document.currentScript.src);


$(document).ready(function () {
    document.getElementById('trial-container').onwheel = function () { if (running) return false; }
    $(document).tooltip({
        position: {
            my: "center bottom-10",
            at: "center top",
        }
    });
    $("input[type='checkbox']").checkboxradio();

    $.getJSON(directoryPath + "php/checkServer.php", function (data) {
        server = data;

        if (server.htaccess)
            rewrite=true;
        else
            rewrite=false;
        if (Cookies.get('experiments')) {
            experiments = Cookies.get('experiments').split(",");
            experiments = experiments.slice(0, -1);
            for (e = 0; e < experiments.length; e++) {
                ee = experiments[e].split("|");
                if (rewrite) {
                    hrefRes = directoryPath+'results/' + ee[0] + '/';
                    hrefRun = directoryPath+'experiment/' + ee[0] + '/'
                } else {
                    hrefRes = directoryPath + "php/viewResults.php?experiment-id=" + ee[0];
                    hrefRun = directoryPath + "index.html?experiment-id=" + ee[0];
                }
                $(".created-list").append('<li><strong>' + ee[1] + '</strong> <a href="' + hrefRes + '" title="See results"><i class="fas fa-poll-h"></i></a> <a href="' + hrefRun + '" title="Run"><i class="fas fa-play"></i></a></li>');
            }
            $(".form-box .created").show();
        }
    })

    const [, , subdomain] = window.location.hostname.split(".").reverse();
    if (subdomain == "dev") {
        cheatCode = true;
        version = version + "-dev";
        $.ajax({ url: "/js/main.js", type: "HEAD" }).done((dd, s, xhr) => {
            let d = new Date(Date.parse(xhr.getResponseHeader("Last-Modified")));
            var dateStr = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2)
                + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);

            $(".credits").append("<div style='font-size:12px'>" + dateStr + "</div>");
        });
        activateCheatCode();
    }

    $("#version").text(version);

    if (md.phone()) {
        $("#form-container").html("<img src='/images/simple_phy.svg' class='logo' width='600'><br><div class='error' style='display:block'><i class='fas fa-exclamation-circle'></i> You cannot use SimplePhy in a mobile device, please try again in a laptop or desktop computer</div>");
        $("#form-box").hide();
    } else if (!md.is('WebKit') && !md.userAgent() === "Firefox") {
        $("#form-container").html("<img src='/images/simple_phy.svg' class='logo' width='600'><br><div class='error' style='display:block'><i class='fas fa-exclamation-circle'></i> Currently, SimplePhy is only compatible with WebKit-based browsers like Google Chrome or Firefox</div>");
        $("#form-box").hide();
    }


    var parentOffset = null;
    var prevX, prevY, relX, relY;
    var scrollSpeed = 8;
    var pixelsPerCM = 0;

    var maxTrials = 20;
    var stimuli_name = "noise" + trialID;


    var presenceSequence = null;

    var monitorHeight, monitorWidth;

    var ccWidthCM = 8.560;

    var params = window.location.pathname.split('/').slice(1);
    var getID = findGetParameter("experiment-id");
    if (getID != null && !window.location.href.includes("php")) {
        params[0] = "experiment";
        params[1] = getID;
    }

    if (Cookies.get('simplephy')) {
        cookie = Cookies.get('simplephy').split(",");
        params[0] = "experiment";
        params[1] = cookie[0];
        cookieName = cookie[1];
        $("#name").hide();
        $(".home-instructions").hide();
        $("#load-experiment-label").hide();
        $("#form-container img").after("<p>We found an experiment already started, please finish it before proceeding.</p>");
        $("#form-container #start-experiment").parent().after("<input type='button' id='delete-experiment' value='Delete data and restart'>");
    }

    if (params[0] == "experiment") {
        resumingExperiment = true;
        $("#form-box").html("<i class='fas fa-hourglass fa-spin'></i>");
        $.getJSON(directoryPath + "experiment/" + params[1] + ".json", function (data) {
            loadExperimentData(data);
            resumingExperiment = false;
            //console.log(arr.config.options);
            if ("local" in arr.config.options && arr.config.options.local) {
                //local experiment
                $(".home-instructions").html('<p>This is a <strong>local experiment</strong>, please provide the path to the folder with the files in your computer:</p>');
                $(".home-instructions").show();
                $("#local-drive-files").show();
                $("#name").parent().hide();
                $(".logo").css("filter", "sepia(100%)");
                $(".logo").after("<h2 style='margin-top: -50px; text-transform: uppercase; font-size: 3em;'>Local</h2>");
            }
        })
            .fail(function () {
                $.ajax({
                    type: "POST",
                    url: directoryPath + "php/createExperiment.php",
                    data: { "load-id": params[1] },
                    dataType: "json",
                    success: function (data) {
                        loadExperimentData(data);
                        //console.log(data);
                        resumingExperiment = false;
                    },
                    error: function (data) {
                        $(".error").html("<i class='fas fa-exclamation-circle'></i> There has been a problem loading your experiment, please contact the experimenter!");
                        $(".error").show();
                        $("#form-box").hide();
                        resumingExperiment = false;
                        //console.log("ERROR");
                        //console.log(data);
                    }
                });
            });
    }

    $("#start-experiment").click(function (e) {

        if (resumingExperiment) return;

        if ("local" in arr.config.options && arr.config.options.local) {
            arr.config.options.localFolder = $("#local-drive-path").val();
            if (arr.config.options.localFolder == "") {
                $(".error").html("<i class='fas fa-exclamation-circle'></i> Invalid local path. Please try again.");
                $(".error").show();
                return;
            }
        }

        if (arr.config.options.calibration <= 0)
            calibrated = true;

        if (!calibrated && !cheatCode) {
            calibrating = true;
            document.documentElement.requestFullscreen();
            blindSpotDistance = [];
            $("#calibration-dialog").show();
            $("#calibration-dialog .close").show();
            $(".background").css("filter", "blur(4px)");
            $("body").css({ overflow: 'hidden' });
            $(".background").css("opacity", ".4");
            return false;
        }

        name = $("#name").val();
        //maxTrials = Math.min(50,$("#maxTrials").val());
        presence = 50;
        ratings = $("#ratings").val();

        monitorHeight = $("#height").val();
        monitorWidth = $("#width").val();
        trialSequence = Array.from(Array(maxTrials).keys());
        //trialSequence.sort(function(a, b) {return 0.5 - Math.random()});
        presenceSequence = Array.from(Array(parseInt(maxTrials * presence / 100)), () => 1);
        presenceSequence = presenceSequence.concat(Array.from(Array(parseInt(maxTrials * (1 - presence / 100))), () => 0));
        //TODO: CONDITION SEQUENCE PER NUMBER OF TRIALS

        trialID = trialSequence[arr.data.length];



        currentSlice = 0;


        if (name == "") {
            name = "Participant";
        }

        name = name + "-" + (new Date().getTime());

        resuming = false;
        if (arr.continueFrom > 0) {
            resuming = true;
            name = arr.name;
            arr.continueFrom--;
            trialID = trialSequence[arr.continueFrom];
        }

        arr = {
            config: {
                maxTrials: maxTrials,
                display: {
                    stimulusHeight: null,
                    stimulusWidth: null,
                    distance: [],
                    windowWidth: window.innerWidth,
                    windowHeight: window.innerHeight,
                    pixelsPerCM: pixelsPerCM,
                    blindSpotDistance: blindSpotDistance,
                    pixelsPerDegree: [],
                },
                conditions: arr.config.conditions,
                options: arr.config.options,
                version: version,
            },
            continueFrom: 0,
            startTime: Date.now(),
            data: []
        };
        if (!cheatCode)
            document.documentElement.requestFullscreen();


        if (resuming || cookieName != "") {
            if (cookieName == "") {
                params[1] = arr.config.options.id;
            } else {
                name = cookieName;
            }
            $.ajax({
                type: "POST",
                url: directoryPath + "php/createExperiment.php",
                data: { "load-id": params[1], "participant-id": name },
                dataType: "json",
                success: function (data) {
                    arr = data;
                    arr.continueFrom = arr.continueFrom;
                    if (arr.sortIndexes && arr.continueFrom == arr.sortIndexes.length) {
                        resetExperiment(1, calibrating, animCalibration, "You already finished this experiment");
                        Cookies.remove('simplephy', { path: window.location.pathname });
                    }
                    beginExperiment(true);
                },
                error: function (data) {
                    //console.log("ERROR");
                    //console.log(data["responseText"]);
                    //beginExperiment(false);
                    resetExperiment(1, calibrating, animCalibration, "There was an error loading your data, please delete your data and try again");
                }
            });
        } else {
            if (!arr.config.conditions) {
                $.getJSON("/experiment/" + testExperimentID + ".json", function (data) {
                    loadExperimentData(data);
                    beginExperiment(false);
                    //console.log(arr.config.options);
                })
                    .fail(function () {
                        $.ajax({
                            type: "POST",
                            url: directoryPath + "php/createExperiment.php",
                            data: { "load-id": testExperimentID },
                            dataType: "json",
                            success: function (data) {
                                loadExperimentData(data);
                                beginExperiment(false);
                            },
                            error: function (data) {
                                //console.log("ERROR");
                                //console.log(data);
                            }
                        });
                    });
            } else
                beginExperiment(false);
        }


        //
        marks = [];
        $(".mark").remove();

        $("#form-container").hide();
        //$("#trial-container").hide();

        //stimuli=load_stimuli(stimuli_name);


    });

    $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");
    $(window).bind('mousewheel DOMMouseScroll', function (event) {
        if (!running || numSlices == 1 || arr.config.options.multiple == "first" || preparation) return;
        if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
            // scroll up
            direction = -1;
        }
        else {
            // scroll down
            direction = 1;
        }
        currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + direction));
        scrolling.push(Array(direction, Date.now()));

        //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
        $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);

        /*var sp2 = document.getElementById("stimulus");
        console.log(stimuli.img[currentSlice]);
        sp2.replaceChild(stimuli.img[currentSlice], sp2.childNodes[0]);*/
        //$("#stimulus #stimulus-img").attr("src",stimuli.img[currentSlice]);

        $("#stimulus-slice").text("Slice: " + (currentSlice + 1));
        $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");


    });

    $("#stimulus").draggable({
        start: function (e) {
            if (!running || numSlices == 1 || arr.config.options.multiple == "first") return;
            parentOffset = $(this).offset();
            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            prevX = relX;
            prevY = relY;
        },
        drag: function (e) {
            if (!running || numSlices == 1 || arr.config.options.multiple == "first") return;
            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            //console.log(relX,relY);
            if (relY > prevY + scrollSpeed) {
                direction = 1;
                prevX = relX;
                prevY = relY;
            } else if (relY < prevY - scrollSpeed) {
                direction = -1;
                prevX = relX;
                prevY = relY;
            }
            currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + direction));
            scrolling.push(Array(direction, Date.now()));
            //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
            $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
            $("#stimulus-slice").text("Slice: " + (currentSlice + 1));
            $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");
        },
        stop: function (e) {

        },
        helper: function (event) {
            return $("<div class='ui-widget-header' style='display:none'>I'm a custom helper</div>");
        }
    });

    $("#stimulus-scroll-bar").draggable({
        start: function (e) {
            if (!running || numSlices == 1 || arr.config.options.multiple == "first") return;
            parentOffset = $(this).offset();
            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            direction = Math.round(numSlices * relY / $(this).height()) - currentSlice;
            currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + direction));

            if (direction != 0)
                scrolling.push(Array(direction, Date.now()));

            //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
            $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
            $("#stimulus-slice").text("Slice: " + (currentSlice + 1));
            $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");
        },
        drag: function (e) {
            if (!running || numSlices == 1 || arr.config.options.multiple == "first") return;
            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            direction = Math.round(numSlices * relY / $(this).height()) - currentSlice;
            currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + direction));

            if (direction != 0)
                scrolling.push(Array(direction, Date.now()));

            //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
            $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
            $("#stimulus-slice").text("Slice: " + (currentSlice + 1));
            $("#stimulus-scroll-position").css("height", 100 * (currentSlice + 1) / numSlices + "%");
        },
        stop: function (e) {

        },
        helper: function (event) {
            return $("<div class='ui-widget-header' style='display:none'>I'm a custom helper</div>");
        }
    });

    var currentSize = 50;
    var ccRatio = 1.5857725083364208966283808818081;
    $("#calibration-dialog .credit-card-slider-position").draggable({
        start: function (e) {
            parentOffset = $(this).parent().offset();

            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            currentSize = Math.round(100 * relX / $(this).parent().width());
            //console.log($(this).parent().width(),relX,currentSize);
            currentSize = Math.max(-2, Math.min(currentSize, 98));
            //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
            $("#calibration-dialog .credit-card-slider-position").css("left", currentSize + "%");
            $("#calibration-dialog .credit-card-outline").css("width", (100 + (currentSize * 300 / 100)) + "px");
            $("#calibration-dialog .credit-card-outline").css("height", ((100 + (currentSize * 300 / 100)) / ccRatio) + "px");


        },
        drag: function (e) {
            parentOffset = $(this).parent().offset();
            relX = e.pageX - parentOffset.left;
            relY = e.pageY - parentOffset.top;
            currentSize = Math.round(100 * relX / $(this).parent().width());
            //console.log($(this).parent().width(),relX,currentSize);
            currentSize = Math.max(-2, Math.min(currentSize, 98));
            //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
            $("#calibration-dialog .credit-card-slider-position").css("left", currentSize + "%");
            $("#calibration-dialog .credit-card-outline").css("width", (200 + (currentSize * 300 / 100)) + "px");
            $("#calibration-dialog .credit-card-outline").css("height", ((200 + (currentSize * 300 / 100)) / ccRatio) + "px");
            $("#calibration-dialog .credit-card-slider-position").css("border", "3px solid rgb(229, 72, 35)");
        },
        stop: function (e) {
            $("#calibration-dialog .credit-card-slider-position").css("border", "3px solid white");
        },
        helper: function (event) {
            return $("<div class='ui-widget-header' style='display:none'>I'm a custom helper</div>");
        }
    });

    $(document).on(
        'keydown', function (event) {
            //$(document).unbind( "keydown" );
            if (generatingKeys) {

                newKeys = $("#keys").val().split(',');
                pressedKeyNow = newKeys.indexOf(event.code);
                if (pressedKeyNow > -1) {
                    newKeys.splice(pressedKeyNow, 1);
                } else {
                    newKeys.push(event.code);
                }
                $("#keys").val(newKeys.join(','));
                $("#generate-keys").text("Edit...");
                generatingKeys = false;
                event.stopPropagation();
                event.preventDefault();
                event.returnValue = false;
                event.cancelBubble = true;
                //console.log(event);
                return false;
            } else if (showingFeedback) {
                $("#feedback-container").hide();
                saveTrial(-1);
            } else if (calibrating) {
                if (event.which == 32 && $("#calibration-step2").is(":visible")) { //spacebar
                    r1 = $("#calibration-step2 .blind-spot-dot").css("right");
                    r2 = $("#calibration-step2 .blind-spot-cross").css("right");
                    w2 = $("#calibration-step2 .blind-spot-cross").css("width");
                    r1 = parseInt(r1.substr(0, r1.length - 2));
                    r2 = parseInt(r2.substr(0, r2.length - 2));
                    w2 = parseInt(w2.substr(0, w2.length - 2)) / 2;
                    blindSpotDistance.push(r1 - (r2 - w2));
                    $("#calibration-step2 .blind-spot-dot").css("right", "100px");
                    clearInterval(animCalibration);
                    animCalibration = calibrationMove($("#calibration-step2 .blind-spot-dot"));
                    if (blindSpotDistance.length > 4) {
                        $("#calibration-step2").toggle();
                        $("#calibration-step3").toggle();
                        calibrated = true;
                        clearInterval(animCalibration);
                    }
                    return false;
                } else if (event.key == "Escape") {
                    cancelPopup(animCalibration);
                    calibrating = false;
                }
            } else if (responding && (event.which == 32 || event.key == "Enter")) {
                if ($(".textresponse").is(":focus")) return true;

                responseDivs = $('.question');

                responses = [];
                for (r = 0; r < responseDivs.length; r++) {
                    resp = $(responseDivs[r]).find(".textresponse").val();
                    //console.log($(responseDivs[r]));
                    if ((resp != undefined && resp == "") || (resp === undefined && $(responseDivs[r]).attr("value") == "-1"))
                        return false;
                    else if (!resp)
                        resp = $(responseDivs[r]).attr("value");
                    responses.push(resp);
                }
                saveTrial(responses);
                responding = false;
            } else if (running) {
                if (preparation) {
                    preparation = false;
                    if (arr.config.options.timeout[currentSlice] > 0) {
                        timeout = setTimeout(
                            showResponse,
                            arr.config.options.timeout[currentSlice],
                            arr.config.options.ratings,
                            arr.continueFrom + 1
                        );
                    }
                    stimulusOn = Date.now();
                    $("#trial-container .text").hide();
                    $("#stimulus-container").show();
                    window.scrollTo(0, 0);
                    if ($("#stimulus .stimulus-img").is("video")) {
                        //console.log("restart");
                        $("#stimulus .stimulus-img")[0].currentTime = 0;
                        $("#stimulus .stimulus-img").trigger('play');
                    }

                    return;
                }

                if (Date.now() - stimulusOn < 200) return; // check for double space

                pressedKeyNow = allowedKeys.indexOf(event.code);

                if (pressedKeyNow > -1) { //spacebar
                    pressedKey.push(Array(allowedKeys[pressedKeyNow], Date.now()));
                    if (!arr.config.options.multiple.startsWith("MAFC")) {
                        if ($("#stimulus .stimulus-img").is("video")) {
                            $("#stimulus .stimulus-img").trigger('pause');
                        }
                        if (!arr.config.options.timeout[currentSlice] || arr.config.options.timeout[currentSlice] <= 0) {
                            if (arr.config.options.multiple == "first") {
                                if (numSlices - 1 == currentSlice) {
                                    showResponse(arr.config.options.ratings, arr.continueFrom + 1);
                                } else {
                                    //show the next image (if any)
                                    currentSlice = Math.max(0, Math.min(numSlices - 1, currentSlice + 1));
                                    scrolling.push(Array(1, Date.now()));

                                    //$("#stimulus").attr("src","stimuli/noise1/noise1_"+currentSlice+".jpg");
                                    $("#stimulus .stimulus-img").replaceWith(stimuli.img[currentSlice]);
                                }
                            } else
                                showResponse(arr.config.options.ratings, arr.continueFrom + 1);
                        }
                    }
                } else if (event.key == "Enter") {
                    if ($("#stimulus .stimulus-img").is("video")) {
                        $("#stimulus .stimulus-img").trigger($("#stimulus .stimulus-img").prop('paused') ? 'play' : 'pause');
                        playPause.push(Array(Date.now(), $("#stimulus .stimulus-img").prop('paused')));
                    }
                } else if (event.key == "Escape") {
                    /*$("#response-container").hide();
                    $("#trial-container").hide();
                    $("#form-container").show();
                    $("#name").val("");
                    $("body").css("background-color","#39302a");
                    $("#help").hide();*/
                    resetExperiment(running, calibrating, animCalibration);
                } else if (event.key == "h") { //help
                    getDisplayParameters();
                    $("#help").toggle();
                } else if (event.key == "F5") {
                    resetExperiment(running, calibrating, animCalibration);
                    location.reload();
                }
            }
        });


    $("#stimulus").dblclick(function (event) { //double click event
        //console.log(event.target, event.offsetX,event.offsetY);
        et = $(event.target);
        if (arr.config.options.multiple.startsWith("MAFC")) {
            marks.push(parseInt(et.attr("numImg")));
            showResponse(arr.config.options.ratings, arr.continueFrom + 1);
        } else if (arr.config.options.mark.localeCompare("true") == 0) {
            //console.log(et,"double");
            if (et.is("circle") || et.is("svg")) {
                var parentOffset = $(this).offset();
                var relX = event.pageX - parentOffset.left - 10;
                var relY = event.pageY - parentOffset.top - 10;
            } else {
                var relX = event.offsetX;
                var relY = event.offsetY;
            }
            $(".mark").remove();

            if (event.shiftKey) type = 1;
            else if (event.ctrlKey) type = 2;
            else if (event.altKey) type = 3;
            else type = 0;

            found = false;
            for (i = marks.length - 1; i >= 0; i--) {
                //console.log(i,relX,relY,marks[i][0],marks[i][1],Math.getDistance(relX,relY,marks[i][0],marks[i][1]));
                if (Math.getDistance(relX, relY, marks[i][0], marks[i][1]) < 50) {
                    if (marks[i][4] == type) {
                        //delete mark
                        marks.splice(i, 1);
                        found = true;
                    } else {
                        marks[i][4] = type;
                        found = true;
                    }
                }
            }

            if (!found) {
                marks.push(Array(relX, relY, parseInt(et.attr("numImg")), Date.now(), type));
            }
            //console.log(marks);
            var radius = 40;
            for (i = 0; i < marks.length; i++) {
                newelement = $('<svg height="100" width="100"><circle cx="' + (radius + 10) + '" cy="' + (radius + 10) + '" r="' + (radius) + '" stroke="' + markColors[marks[i][4]] + '" stroke-width="4" fill="transparent" /></svg>');
                newelement.addClass("mark");
                newelement.appendTo($("#stimulus"));
                newelement.css({
                    "left": marks[i][0] - radius + "px",
                    "top": marks[i][1] - radius + "px"
                });
            }
        }


    });

    document.addEventListener("fullscreenchange", function (event) {
        if (document.fullscreenElement) {
            // fullscreen is activated
        } else if (!cheatCode) {
            // fullscreen is cancelled
            resetExperiment(running, calibrating, animCalibration);
            calibrated = running = loading = false;
        }
    });

    $(window).blur(function () {
        if (!cheatCode) {
            resetExperiment(running, calibrating, animCalibration);
        }
    });

    $('body').on('click', '.rating', function (e) { //click on confidence rating
        rating = $(this).attr("num");
        $(this).parent().parent().attr("value", rating);
        $(this).parent().find(".rating").removeClass("selected");
        $(this).toggleClass("selected");
        return false;
    });

    $('body').on('mousemove', '.slider', function (e) {
        r = $(this).val();
        $(this).parent().find(".slider-value").html(r);
        $(this).parent().parent().parent().attr('value', r);
    });

    $(window).resize(function () {
        //display=getDisplayParameters(arr["config"]["display"]);
        //$("#stimulus").css("text-align","none");
        //$("#stimulus").css("text-align","center");
        if (!document.fullscreenElement) {
            resetExperiment(running, calibrating, animCalibration);
            calibrated = running = false;
        }
    });


    $(".question-mark").click(function () {
        $("#help-screen").toggle();
    });
    $(".close").click(function () {
        cancelPopup(animCalibration);
        $("body").css({ overflow: 'auto' })
        calibrating = false;
    });
    $("#calibration-step1 .button").click(function () {
        left = $("#calibration-dialog .credit-card-outline").css("width");
        $("#calibration-step1").toggle();
        $("#calibration-step2").toggle();
        left = parseInt(left.substr(0, left.length - 2));
        //console.log(left);
        pixelsPerCM = left / ccWidthCM;
        animCalibration = calibrationMove($("#calibration-step2 .blind-spot-dot"));
    });
    $("#calibration-step3 .button").click(function () {
        $(".background").css("filter", "none");
        $(".background").css("opacity", "1");
        $("#calibration-step1").toggle();
        $("#calibration-step3").toggle();
        $("#calibration-dialog").toggle();
        getDisplayParameters();
        calibrating = false;
    });

    $("#create-experiment").click(function () {
        if ($(this).hasClass("disabled")) return false;

        fields = $("#form-box").find("input, select");
        options = {};
        for (f = 0; f < fields.length; f++) {
            if (fields[f].type.localeCompare("button") != 0) {
                name = $(fields[f]).attr("id");
                if (fields[f].type.localeCompare("checkbox") == 0) {
                    options[name] = $(fields[f]).prop('checked').toString();
                } else if (name.localeCompare("ratings") == 0) {
                    if ($(fields[f]).val() == 11)
                        options[name] = "50";
                    else if ($(fields[f]).val() == 12)
                        options[name] = "100";
                    else
                        options[name] = $(fields[f]).val();
                } else {
                    options[name] = $(fields[f]).val();
                }
            }
        }

        if ($("#title").val() == "")
            options["title"] = "Experiment";

        options["id"] = createUUID();

        if (localExperiment) {
            options["local"] = true;
        } else {
            options["local"] = false;
        }

        download = {
            options: options,
            conditions: arr.config.conditions
        };

        $.ajax({
            type: "POST",
            url: directoryPath + "php/createExperiment.php",
            data: {
                "experiment-data": JSON.stringify(download),
                "experiment-id": options["id"],
                "title": options["title"]
            },
            dataType: "json",
            success: function (data) {
                //console.log("SUCCESS");
                //console.log(data["experiment-id"]);
                cookie = "";
                newCookie = options["id"] + "|" + options["title"] + ",";
                if (Cookies.get('experiments')) {
                    cookie = Cookies.get('experiments').split(",");
                    for (e = 0; e < Math.min(cookie.length, 4); e++) {
                        if (cookie[e]) {
                            newCookie = newCookie + cookie[e] + ",";
                        }
                    }
                }
                Cookies.set('experiments', newCookie, { expires: 365, sameSite: 'strict', path: "/" })

                var hiddenElement = document.createElement('a');

                hiddenElement.href = 'data:attachment/text,' + JSON.stringify(download);
                hiddenElement.target = '_blank';
                hiddenElement.id = 'download';

                hiddenElement.download = options["title"] + '.pso';

                hiddenElement.text = 'Download now';
                hiddenElement.click();

                if (rewrite) {
                    hrefRes = directoryPath+'results/' + options["id"] + '/';
                    hrefRun = directoryPath+'experiment/' + options["id"] + '/'
                } else {
                    hrefRes = directoryPath + "php/viewResults.php?experiment-id=" + options["id"] + "/";
                    hrefRun = directoryPath + "index.html?experiment-id=" + options["id"];
                }

                $("#form-box").html("<h3>Experiment created!</h3><p>Send your participants the following link:</p> \
                    <p><a href='"+ hrefRun + "' target='_blank'>" + hrefRun + "</a></p> \
                    <p style='margin-bottom:20px'></p>\
                    <p>You will find your results in the following URL, <strong>copy this link somewhere!</strong></p> \
                    <p><a href='"+ hrefRes + "' target='_blank'>" + hrefRes + "</a></p>");

            },
            error: function (data) {
                resetExperiment(1, calibrating, animCalibration, "There was an error creating the experiment, please try again");
                //console.log("ERROR");
                console.log(data.responseText);
            }
        });



        //document.getElementById('form_container').prepend(document.createElement('br'));
        //document.getElementById('download').replaceWith(hiddenElement);
    });

    $('#load-experiment').on('change', function () {
        var fileReader = new FileReader();
        var data;
        fileReader.onload = function (e) {
            loadExperimentData(JSON.parse(fileReader.result));
        };
        if (fileReader)
            data = fileReader.readAsText($('#load-experiment').prop('files')[0]);
        //console.log(data);
    });

    $("#ratings").on('mousemove', function () {
        r = $(this).val();
        if (r == 1)
            r = "disabled";
        else if (r == 11) {
            $(this).val(50);
            r = 50;
        } else if (r == 12) {
            $(this).val(100);
            r = 100;
        }
        $("#slider-value").html(r);
    });

    $(document).key('ctrl+shift+f', function () {
        activateCheatCode();
        cheatCode = !cheatCode;
    });

    $(document).key('ctrl+g', function (e) {
        $("#google-login").toggleClass("hidden");
        e.preventDefault();
        return false;
    });

    $(".form-box #create-title").click(function () {
        $("#create-toggle").toggleClass("show-inline-block");
        $("#create-title").children(".icon").toggleClass("fas fa-plus-square");
        $("#create-title").children(".icon").toggleClass("far fa-minus-square");
    });

    $("#delete-experiment").on('click', function () {
        Cookies.remove('simplephy', { path: window.location.pathname });
        location.reload();
    });

    $("#generate-keys").click(function () {
        generatingKeys = true;
        $(this).text("Press a key");
    });

    $("#advanced-options").click(function () {
        $("#advanced-options-dialog").show();
        $("#advanced-options-dialog .close").show();
        $(".background").css("filter", "blur(4px)");
        $(".background").css("opacity", ".4");
        $("body").css({ overflow: 'hidden' });
    });

    $('body').on('change', '.advanced-options-new', function () {
        val = $(this).val();
        added = "<input class='advanced-option-question' type='text' placeholder='Text for the question (optional)' size='30'/> Correct response: <input type='text' class='correct-option' title='Optional. Introduce the correct response (e.g. Car)' />";
        if (val == "select") {
            added += "<ol><li><input type='text' placeholder='Option'/></li><li class='advanced-select-add'><i class='fas fa-plus'></i></li></ol>";
        } else if (val == "ratings") {
            added += "<ul><li>Maximum rating: <input type='number' value='100' /></li></ul>";
        } else if (val == "none") {
            added = "";
        }

        $(this).parent().find(".options").html(added);
    });

    $(".advanced-option-add").click(function () {
        num = parseInt($(".advanced-option").last().attr("num"));
        options = $(".advanced-option").last().find("select").html();
        added = '<div class="advanced-option" num="' + (num + 1) + '"><span class="advanced-option-delete"><i class="fas fa-trash-alt"></i></span><select class="advanced-options-new">' + options + '</select><span class="options"></span></div>';
        $(this).before(added);
    });

    $('body').on('click', '.advanced-select-add', function () {
        added = "<li><input type='text' placeholder='Option'/> <span class='advanced-select-delete'><i class='fas fa-trash-alt'></i></span></li>";
        $(this).before(added);
    });
    $('body').on('click', '.advanced-select-delete, .advanced-option-delete', function () {
        $(this).parent().remove();
    });
    $("#advanced-options-dialog .button").click(function () {
        options = $(".advanced-option");
        downloadOptions = {};
        customResponse = [];
        correctResponse = [];
        for (i = 0; i < options.length; i++) {
            type = $(options[i]).find("select").val();
            newOption = { question: $(options[i]).find(".advanced-option-question").val() };
            if (type != "none") {
                newOption.type = type;
                newCorrect = "";
                if (type == "ratings") {
                    newOption.max = $(options[i]).find("input[type='number']").val();

                } else if (type == "select") {
                    newSelect = [];
                    selectOptions = $(options[i]).find("ol input[type='text']");
                    for (j = 0; j < selectOptions.length; j++) {
                        newSelect.push($(selectOptions[j]).val());
                    }
                    newOption.options = newSelect;
                }
                customResponse.push(newOption);
                correctResponse.push($(options[i]).find(".correct-option").val());
            }
        }
        if ($(".advanced-options-text").val() != "")
            downloadOptions.text = $(".advanced-options-text").val();
        if ($(".advanced-options-key").val() != "")
            downloadOptions.correctKey = $(".advanced-options-key").val();

        if (customResponse.length > 0) {
            downloadOptions.customResponse = customResponse;
            downloadOptions.correctResponse = correctResponse;
        }

        if (Object.entries(downloadOptions).length != 0) {

            var hiddenElement = document.createElement('a');
            hiddenElement.href = 'data:attachment/text,' + JSON.stringify(downloadOptions);
            hiddenElement.target = '_blank';
            hiddenElement.download = 'info.json';
            hiddenElement.click();
        }
        //

        $(".background").css("filter", "none");
        $(".background").css("opacity", "1");
        $("body").css({ overflow: 'auto' })
        $("#advanced-options-dialog").hide();
    });

    $(".tab").click(function () {
        $(".tab").removeClass("active");
        $(this).addClass("active");
        $(".tab-container").hide();
        var id = $(this).attr('id');
        $("#" + id + "-container").show();
    });
    $("#local-drive-select").click(function () {
        $("#local-drive-dialog").show();
        $(".background").css("filter", "blur(4px)");
        $("body").css({ overflow: 'hidden' });
        $(".background").css("opacity", ".4");
    })
    $("#local-drive-experiment").on("change", function () {
        localFileList = $(this)[0].files;
        localStimuli = {};
        for (let i = 0; i < localFileList.length; i++) {
            path = localFileList[i].webkitRelativePath.split("/");
            path = path.slice(1).join("/");
            localStimuli[path] = localFileList[i];
        }
        $(this).parent().replaceWith("<p><strong>Trials loaded, you may proceed.</strong></p>");
        $("#name").parent().show();

    });
    $("#local-drive-submit").change(function () {
        folder_ids = [];
        localFileList = $(this)[0].files;
        list = "";
        all_conditions = {};
        for (let i = 0; i < localFileList.length; i++) {
            item = localFileList[i].webkitRelativePath;
            list += item + "<br>";
            path = item.split("/");
            // console.log(path);
            if (path.length == 4) { // we have conditions
                if (!(path[1] in all_conditions)) {
                    all_conditions[path[1]] = {}; // add new condition
                }
                if (!(path[2] in all_conditions[path[1]])) {
                    // add new trial
                    all_conditions[path[1]][path[2]] = { info: [], feedback: [], images: [] };
                }
                if (path[3].includes("feedback")) {
                    all_conditions[path[1]][path[2]]["feedback"].push(path[1] + "/" + path[2] + "/" + path[3]);
                } else if (path[3].includes(".json")) {
                    //all_conditions[path[1]][path[2]]["infoFiles"].push($("#local-drive-path").val() + "/" + path[1] + "/" + path[2] + "/" + path[3]);
                    var reader = new FileReader();
                    reader.readAsText(localFileList[i]);
                    text = "";
                    reader.p1 = path[1];
                    reader.p2 = path[2];
                    reader.onload = function (e) {
                        // browser completed reading file - display it
                        text = e.target.result;
                        all_conditions[this.p1][this.p2]["info"] = $.parseJSON(text);
                    };
                } else { //(path[3].includes(".jpg")) {
                    //console.log(path);
                    all_conditions[path[1]][path[2]]["images"].push({ id: "local", name: path[1] + "/" + path[2] + "/" + path[3] });
                }
            } else if (path.length == 3) { //we just have one condition

            }
        };
        $(this).parent().replaceWith("<p><strong>Trials loaded, you may proceed.</strong></p>");
        $("#local-drive-result").html(list);
    });

    $("#local-drive-dialog .button").click(function () {
        cancelPopup(null);
        //console.log(all_conditions);
        if (!$.isEmptyObject(all_conditions)) {
            arr.config.conditions = Object.values(all_conditions);
            arr.config.conditions = [];
            var count = 0;
            for (var cond in all_conditions) {
                //add condition
                arr.config.conditions.push({ id: "local", name: cond, stimuli: { infoFiles: [], feedbackFiles: [], stimulusFiles: [] } });
                for (var trial in all_conditions[cond]) {
                    arr.config.conditions[arr.config.conditions.length - 1].stimuli.infoFiles.push(all_conditions[cond][trial]["info"]);
                    arr.config.conditions[arr.config.conditions.length - 1].stimuli.feedbackFiles.push(all_conditions[cond][trial]["feedback"]);
                    arr.config.conditions[arr.config.conditions.length - 1].stimuli.stimulusFiles.push(all_conditions[cond][trial]["images"]);
                }
            }
            localExperiment = true;
            $("#create-experiment").removeClass("disabled");
        }
    });

});

window.addEventListener('beforeunload', function (e) {
    if (running || loading) {
        resetExperiment(running, calibrating, animCalibration);
        e.preventDefault();
        e.returnValue = '';
    }
});
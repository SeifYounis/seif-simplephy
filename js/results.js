$(document).ready(function () {
    $('body').on('dblclick', '.results .delete', function (e) {
        id = $(this).parent().attr('name');
        experimentid = $(".results").attr("id");
        payload = { "delete": id, "password": Cookies.get('password') };
        elem = $(this);
        elem.parent().parent().hide();
        participants.splice(participants.indexOf(id), 1);
        $.ajax({
            type: "POST",
            data: payload,
            //dataType: "json",
            url: directoryPath + "php/viewResults.php?experiment-id=" + experimentid,
            success: function (data) {
                //console.log(data);
                //console.log("SUCCESS",data);
                elem.parent().parent().remove();
            },
            error: function (data) {
                //console.log("ERROR", data);
                participants.push(id);
                elem.parent().parent().show();
            }
        })
    });

    $("input[name=password]").keyup(function () {
        password = $(this).val();
        button = $(this).parent().find("input[type=submit]");
        for (i = 0; i < button.length; i++)
            if (password != "") {
                button[i].disabled = false;
            } else {
                button[i].disabled = true;
            }
    });
});

function loadParticipantCloud(p, force = 0) {
    payload = { "download": p, "force": force, "password": Cookies.get('password') };
    experimentid = $(".results").attr("id");
    if ($("#tab-edit-container").find("h3").text().includes("LOCAL")) {
        $("#force-reload").hide();
    }
    $.ajax({
        type: "POST",
        url: directoryPath + "php/viewResults.php?experiment-id=" + experimentid,
        data: payload,
        dataType: "json",
        beforeSend: function () {
            if (force)
                $("#force-reload").addClass("fa-spin");
            num = $(".results li").length + 1;
            elem = "<li><div num='" + num + "' class='loading name' name='" + p + "'><i class='fas fa-hourglass fa-spin'></i></div></li>";
            $(".results").append(elem);
            $("#download-form").hide();
            $("#delete-form").hide();
        },
        success: function (data) {
            num = $(".results .loading[name='" + p + "']").attr("num");
            name = p.split('-').slice(0, -1).join('-');
            elem = "<div class='name' name='" + p + "'><div class='delete' title='Double click to delete'><i class='fas fa-trash-alt'></i></div><i class='fas fa-user'></i><br> #" + (num) + "</div>" + name + " <div class='progress'>" + parseInt(100 * data.progress) + "%</div><div class='date'>" + data.mostRecent + "</div>";
            $(".results .loading[name='" + p + "']").replaceWith(elem);

            if ($(".results li .loading").length == 0) {
                $("#download-form").show();
                $("#delete-form").show();
            }
            $("#force-reload").removeClass("fa-spin");
        },
        error: function (data) {
            //console.log(data.responseText);
            num = $(".results .loading[name='" + p + "']").attr("num");
            name = p.split('-').slice(0, -1).join('-');
            elem = "<div class='name' name='" + p + "'><div class='delete' title='Double click to delete'><i class='fas fa-trash-alt'></i></div><i class='fas fa-user'></i></div>Missing participant! Please force reload</div>";
            $(".results .loading[name='" + p + "']").replaceWith(elem);
            if ($(".results li .loading").length == 0) {
                $("#download-form").show();
                $("#delete-form").show();
            }
            $("#force-reload").removeClass("fa-spin");
        }
    });
}
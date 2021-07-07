<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if(file_exists("../vendor/autoload.php"))
    require_once("../vendor/autoload.php");

require_once("functions.php");
date_default_timezone_set('America/Los_Angeles');

use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;
    
$offline_mode = false;

if(class_exists("Kreait\Firebase\Factory")){

    if(file_exists('../credentials/psychonline-firebase-adminsdk-12uxl-c8a23d2ad7.json'))
        $firebase = (new Kreait\Firebase\Factory)->withServiceAccount('../credentials/psychonline-firebase-adminsdk-12uxl-c8a23d2ad7.json');
    else
        $firebase = (new Kreait\Firebase\Factory)->withServiceAccount(getenv("firebase_secret"));

    $storage = $firebase->createStorage();
    $storageClient = $storage->getStorageClient();
    $defaultBucket = $storage->getBucket();
}else{
    $offline_mode = true;
    $defaultBucket=null;
}


/*$defaultBucket->upload(file_get_contents("../results/".$_GET['experiment-id']."/title.txt"),
[
    'name' => "uploaded_title.txt"
]);*/

if(isset($_GET['experiment-id'])){
    if(strpos($_GET['experiment-id'],".") !== false){
        exit();
    }
    $experiment_id=sanitize_id($_GET['experiment-id']);
    $folder="results/".$experiment_id;

    $experimentData=getFileCloud("experiment/".$experiment_id.".json",$defaultBucket);
    if(!$experimentData)
        header('Location: /', true, 301);

    $experimentData=json_decode($experimentData);
    
    if(!is_dir("../".$folder))
        mkdir("../".$folder);
        
    $password = getFileCloud($folder."/password.txt", $defaultBucket);

    if($password==""){
        $password=false;
    }

    //echo($_POST['password']."-".password_hash($_POST['password'], PASSWORD_BCRYPT));


    if(isset($_COOKIE['password']) && !isset($_POST['password'])){
        $_POST['password']=$_COOKIE['password'];
    }

    $title="Introduce password";

    if($password){
        
        if(isset($_POST['old-password'])){
            if(function_exists("password_hash")){
                $verified = password_verify($_POST['old-password'],$password);
            }else{
                $verified = crypt($_POST['old-password'], $password) == $password;
            }
            if($verified){
                //file_put_contents($folder."/password.txt",password_hash($_POST['password'], PASSWORD_BCRYPT));
                if(function_exists("password_hash"))
                    $hash = password_hash($_POST['password'], PASSWORD_BCRYPT);
                else
                    $hash = crypt($_POST['password']);
                putFileCloud($folder."/password.txt",$hash,$defaultBucket);
            }
        }elseif(!isset($_POST['password']) || isset($_POST['password'])==""){
            $errorstr='<h1>Introduce your password</h1>';
            $password=false;
            
        }elseif(isset($_POST['password'])){
            if(function_exists("password_hash")){
                $verified = password_verify($_POST['password'],$password);
            }else{
                $verified = crypt($_POST['password'], $password) == $password;
            }
            if(!$verified){
                $errorstr='<h1 class="error" style="display:block;width:auto">Password not valid</h1>';
                $password=false;
                $title="Password error";
            }
        }
    }elseif(isset($_POST['password'])){
        if(function_exists("password_hash"))
            $hash = password_hash($_POST['password'], PASSWORD_BCRYPT);
        else
            $hash = crypt($_POST['password']);
        putFileCloud($folder."/password.txt",$hash,$defaultBucket);
        $password=true;
    }
    if($password && isset($_POST['password'])){

        if(isset($_POST['edit-experiment'])){
            $experimentData->options->title=$_POST['title'];
            $experimentData->options->instructions=$_POST['instructions'];
            $experimentData->options->keys=$_POST['keys'];
            $experimentData->options->ratings=$_POST['ratings'];
            $experimentData->options->randomize=$_POST['randomize'];
            $experimentData->options->multiple=$_POST['multiple'];
            $experimentData->options->calibration=$_POST['calibration'];
            $experimentData->options->timeout=$_POST['timeout'];
            $experimentData->options->mark=isset($_POST['mark'])?"true":"false";
            $experimentData->options->fixationGrid=isset($_POST['fixationGrid'])?"true":"false";
            putFileCloud("experiment/".$experiment_id.".json",json_encode($experimentData),$defaultBucket);
            //var_dump($experimentData->options);

        }elseif(isset($_POST['delete-experiment'])){
            /*if(isset($_COOKIE['experiments'])){
                $expCookies=explode(",",$_COOKIE['experiments']);
                $newCookie="";
                foreach($expCookies as $exp){
                    $nameCookies=explode("|",$exp)[0];
                    if($nameCookies!="" && strcmp($nameCookies,$experiment_id)!=0){
                        $newCookie.=$exp.",";
                    }
                }
                setcookie("experiments",$newCookie,0,"/");
                //var_dump($newCookie);
            }*/

            recursiveDelete("../results/".$experiment_id);
            unlink("../experiment/".$experiment_id.".json");

            if(!$offline_mode){
                $objects = $defaultBucket->objects([
                    'prefix' => "results/".$experiment_id,
                    'orderBy' => 'name_natural',
                ]);
                foreach ($objects as $object) {
                    $object->delete();
                }
                $defaultBucket->object("experiment/".$experiment_id.".json")->delete();                
            }
            header('Location: ../', true, 301);
            exit();
        }elseif(isset($_POST['download'])){
            $participant=sanitize_participant($_POST['download']);
            $force=false;
            if(isset($_POST['force']))
                $force=!($_POST['force']==0);
            
            if (!file_exists("../".$folder."/".$participant)) {
                mkdir("../".$folder."/".$participant);
                chmod("../".$folder."/".$participant,0777);
            }

            if($force){
                $objects = $defaultBucket->objects([
                    'prefix' => $folder."/".$participant,
                    'orderBy' => 'name_natural',
                ]);
                $allDates=array();
                foreach ($objects as $object) {
                    $object->downloadToFile("../".$object->name());
                    array_push($allDates,strtotime($object->info()["updated"]));
                }
                $mostRecent=max($allDates);
                $mostRecent=calculate_time_span(date("U")-$mostRecent);
            }

            $json=json_decode(file_get_contents("../".$folder."/".$participant."/".$participant.".pso"));
            if(!$force){
                if(file_exists("../".$folder."/".$participant."/trial".($json->continueFrom).".pso")){
                    $mostRecent=json_decode(file_get_contents("../".$folder."/".$participant."/trial".($json->continueFrom).".pso"))[0];
                    $mostRecent=calculate_time_span(date("U")-$mostRecent->stimulusOff/1000);
                }else
                    $mostRecent=calculate_time_span(date("U")-$json->startTime/1000);
                
            }

            $ret=array("progress"=>$json->continueFrom/count($json->sortIndexes),"mostRecent"=>$mostRecent);

            header("HTTP/1.1 200 OK");
            echo(json_encode($ret));
            exit();
        }else if(isset($_POST['delete'])){
            $participant=sanitize_participant($_POST['delete']);

            if (!file_exists("../".$folder."/".$participant)) {
                $response=false;
            }else{
                if(!$offline_mode){
                    $objects = $defaultBucket->objects([
                        'prefix' => $folder."/".$participant,
                        'orderBy' => 'name_natural',
                    ]);
                    foreach ($objects as $object) {
                        $object->delete();
                    }
                }
                array_map('unlink', glob("../".$folder."/".$participant."/*.*"));
                rmdir("../".$folder."/".$participant);
                $response=true;
            }
            $ret=array("response"=>$response);

            header("HTTP/1.1 200 OK");
            echo(json_encode($ret));
            exit();
        }

        if(isset($_POST['password'])){
            
            if(strpos($_SERVER['REQUEST_URI'], "?")){
                //we are not rewritting
                setcookie("password", $_POST['password'],0);
            }else{
                setcookie("password", $_POST['password'],0,'results/'.$experiment_id);
            }
        }


        $title=$experimentData->options->title;
        
        if($title==""){
            $title="Experiment";
        }        
        $participants=array();
        if(!$offline_mode){
            $objects = $defaultBucket->objects([
                'prefix' => $folder,
                'orderBy' => 'name_natural',
            ]);
            foreach ($objects as $object) {
                $path=explode("/",$object->name());
                if(count($path)==4){
                    if(!in_array($path[2],$participants))
                        array_push($participants,$path[2]);
                }
            }
        }else{
            $participants = array_slice(scandir("../".$folder),2);
            $participants = array_filter(preg_filter('/^/',"../".$folder."/", $participants),"is_dir");
            $participants = array_map(function($val) {
                return explode('/', $val);
            }, $participants);
            $participants = array_map("end",$participants);
            //print_r($participants);
            //exit();
        }

        if(isset($_GET['zip']) && isset($_POST['password'])){
            $filename="../".$folder.'/'.$experiment_id.'.zip';
            array_map('unlink', glob("../".$folder."/*.zip"));

            if(isset($_POST['JSON'])){
                compress_folder("../".$folder,$filename,".pso"); 
                // exec('cd "../'.$folder.'"; zip -R -o -q '.$experiment_id.'.zip *.pso');
                //echo('tar zcf '.$filename.' '.$folder.'/*.pso');
            
                if (file_exists($filename)) {
                    header('Content-Type: application/zip');
                    header('Content-Disposition: attachment; filename="'.basename($filename).'"');
                    header('Content-Length: ' . filesize($filename));
                
                    flush();
                    readfile($filename);
                    // delete file
                    //unlink($filename);
            
                }
            }elseif(isset($_POST['CSV'])){
                array_map('unlink', glob("../".$folder."/*.csv"));
                foreach($participants as $p){
                    $trials=glob("../".$folder."/".$p."/trial*.pso");
                    if(count($trials)==0)
                        continue;
                    $trials_json=array();
                    foreach ($trials as $t) {
                        $r=json_decode(file_get_contents($t));
                        array_push($trials_json,$r[0]);
                    }
                    //var_dump($participant->data);
                    
                    
                    if(count($trials_json)){
                        
                        $keys=array_keys((array)$trials_json[0]);
                        $keysCSV="";
                        foreach($keys as $key){
                            if(!is_object($trials_json[0]->$key)){
                                $keysCSV=$keysCSV.$key.",";
                            }
                        }
                        
                        $keysCSV=substr($keysCSV, 0, -1);
                        $valuesCSV="";

                        
                        
                        foreach($trials_json as $trial){
                            foreach($keys as $key){
                                if(!is_object($trial->$key)){
                                    if(is_array($trial->$key))
                                        $k=recursive_implode($trial->$key,";");
                                    else
                                        $k=$trial->$key;
                                    if(strlen($k)<32768)
                                        $valuesCSV=$valuesCSV.$k.",";
                                    else
                                    $valuesCSV=$valuesCSV."TOO LONG! DOWNLOAD JSON TO ANALYZE THIS FIELD,";
                                }
                            }
                            $valuesCSV=substr($valuesCSV, 0, -1)."\n";
                        }
                        //echo $keysCSV."\n".$valuesCSV;
                        file_put_contents("../".$folder."/".$p.".csv",$keysCSV."\n".$valuesCSV);
                    }
                    
                }

                compress_folder("../".$folder,$filename,".csv"); 
                // exec('cd "../'.$folder.'"; zip -q '.$experiment_id.'.zip *.csv');
                //echo('tar zcf '.$filename.' '.$folder.'/*.pso');
            
                if (file_exists($filename)) {
                    header('Content-Type: application/zip');
                    header('Content-Disposition: attachment; filename="'.basename($filename).'"');
                    header('Content-Length: ' . filesize($filename));
                
                    flush();
                    readfile($filename);
                }else{
                    echo "There is no data to download yet.";
                }
            }
            exit();
        }
    }       

?>
<head>
<title>Results - <?php echo($title); ?> - Simple Phy</title>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
<link rel="stylesheet" href="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css">
<script src="https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mobile-detect@1.4.4/mobile-detect.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/js-cookie@rc/dist/js.cookie.min.js"></script>
<!-- <script src="/js/jquery.key.js"></script>
<script src="/js/functions.js"></script>
<script src="/js/main.js"></script>
<script src="/js/google_drive.js"></script> -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Nunito">
<link rel="stylesheet" type="text/css" href="/css/style.css">
<link rel="icon" href="favicon.ico" type="image/x-icon" />
<?php if($password){ ?>
    <!-- <script src="/js/results.js"></script> -->
    <script>
        
        var participants=[
            <?php
                foreach($participants as $p){
                    echo ("'".$p."',");
                }
            ?>
        ];
    var path = window.location.href;
    var directoryPath = path.substring(path.indexOf('/'), path.lastIndexOf('/') + 1)
    if (directoryPath.includes("php") || directoryPath.includes("experiment")) {
        directoryPath = directoryPath+"../";
    }else{
        directoryPath = "/";
    }
    $( document ).ready(function() {
        $.getScript(directoryPath + "js/jquery.key.js", function () {
            $.getScript(directoryPath + "js/functions.js", function () {
                $.getScript(directoryPath + "js/main.js", function () {
                    $.getScript(directoryPath + "js/grid.js", function () {
                        $.getScript(directoryPath + "js/google_drive.js",function(){
                            $.getScript(directoryPath + "js/results.js",function(){
                                if(participants.length>0)
                                    for(i=0;i<participants.length;i++){
                                        loadParticipantCloud(participants[i]);
                                    }
                            });
                        });
                    });
                });
            });
        });

        $('head').append('<link rel="stylesheet" type="text/css" href="'+directoryPath + 'css/fontawesome.css">');
        
        $("#force-reload").click(function(){
            if(!$("#force-reload").hasClass("fa-spin") && participants.length>0){
                $(".results li").remove();
                for(i=0;i<participants.length;i++){
                    loadParticipantCloud(participants[i],1);
                }
            }
        })
    });
    </script>
<?php } ?>
</head>
<body>
    <div class="background">
        <div id="trial-container"></div>
        <div id="form-data">
            <a href='../../'><img src="../../images/simple_phy.svg" class="logo" width="400" title="Back to the homepage"></a>
            <div class="credits">Developed by <a
                    href="javascript:location='mailto:\u006d\u0069\u0067\u0075\u0065\u006c\u0061\u006e\u0067\u0065\u006c\u002e\u006c\u0061\u0067\u006f\u0040\u0067\u006d\u0061\u0069\u006c\u002e\u0063\u006f\u006d';void 0">Miguel
                    Lago</a>
                <br>
                version <a id="version" href="https://gitlab.com/malago/simplephy" target="_blank"></a>
            </div> 
            <div class="credits" style="left:5%; width:25%; text-align:left"><a
                    href="https://doi.org/10.3758/s13428-020-01515-z" target="_blank">Lago, Miguel A., “SimplePhy: An
                    open-source tool for quick online perception experiments”. <i>Behav. Res</i> (2020)
                </a>
            </div>
        <?php if(!$password){ 
            if(!isset($errorstr))
                echo("<p>You will need to <strong>create a password</strong> to download the data.</p>");
            else
                echo($errorstr);
        ?>
            <form class="form-box" method="POST">
                <i class="fas fa-key" style="position: absolute; top: 20px; left: 20px;"></i>  
                <input id="password" type="password" name="password" placeholder="password"/><br>
                <input type="submit" class='download-results' id="create-password" value="Submit">
            </form>
            <?php echo "<h2 class='error'><i class='fas fa-lock'></i> Set a password to download your data <i class='fas fa-lock'></i></h2>";
        }else{ 
            if(isset($_SERVER["htaccess"])){
                $href = "/experiment/".$experiment_id."/";
            }else{
                $href = "../index.html?experiment-id=".$experiment_id;
            }
            echo("<h1>Administration area for experiment <strong><a href='".$href."'>".$title."</a></strong></h1>");
            ?>

            <div class="tab active" id="tab-participants" title="Participants"><i class="fas fa-user"></i></div>
            <?php if(count($participants)>0){ ?>
            <div class="tab" id="tab-download" title="Download results"><i class="fas fa-download"></i> </div>
            <?php } ?>
            <div class="tab" id="tab-edit" title="Edit options"><i class="fas fa-edit"></i> </div>
            <div class="tab" id="tab-password" title="Change password"><i class="fas fa-key"></i> </div>
            <div class="tab" id="tab-delete" title="Delete experiment"><i class="fas fa-bomb"></i> </div>

            <div class="tab-container" id="tab-password-container" style="display:none">
                <h3>Change password</h3>
                <form class="form-box" method="POST" style="width:33%; border:none; margin-top:0;">
                    <input id="old-password" type="password" name="old-password" placeholder="old password" /><br>     
                    <input id="password" type="password" name="password" placeholder="new password"/><br>
                    <input type="submit" class='change-password' id="create-password" value="Submit" disabled="disabled">
                </form>
            </div>
            <div class="tab-container" id="tab-participants-container">
            <h3>Participants</h3>
        <?php
            if(count($participants)>0){ 
                echo("<p id='force-reload'><i class='fas fa-sync-alt' title='Force reload'></i></p>");
                echo("<ul class='results' id='".$experiment_id."'></ul>");
                echo("</div>")
                ?>
                <div class="tab-container" id="tab-download-container" style="display:none">
                <h3>Download data</h3>
                <form class="form-box" method="POST" action=<?php 

                if(checkRewrite()){
                    $href = "../".$experiment_id.".zip";
                }else{
                    $href = "./viewResults.php?experiment-id=".$experiment_id."&zip";
                }

                echo ($href);
                
                ?> style="width:33%; border:none; margin-top:0;" id="download-form">   
                    <input id="password-download" type="password" name="password" placeholder="repeat password"/>
                    <div>Choose format: <input type="submit" class='download-results json' value="JSON" name="JSON" disabled="disabled">
                    <input type="submit" class='download-results csv' value="CSV" name="CSV" disabled="disabled"></div>
                </form>
            <?php }else{
                echo("<h1>There are no participants yet!</h1>");
            } ?>
            </div>
            <div class="tab-container" id="tab-delete-container" style="display:none">
                <h3>Delete experiment</h3>
                <form class="form-box" method="POST" style="width:33%; border:none; margin-top:0;" id="delete-form">   
                    <input id="password-delete" type="password" name="password" placeholder="repeat password"/>
                    <input type="submit" class="delete-results" value="Delete experiment" name="delete-experiment" title="This will delete the experiment and all associated data" disabled="disabled">
                </form>
            </div>

            <div class="tab-container" id="tab-edit-container" style="display:none">
                <h3>Edit experiment options <strong><?php echo($experimentData->options->local?" (LOCAL)":""); ?></strong></h3>
                <form class="form-box" id="form-box" style="border:0;margin:auto;padding:0" method="POST">
                    <table style="max-width: 500px;margin:auto">
                        <tr>
                            <th>Title</th>
                            <td><input id="title" type="text" style="width:100%;text-align:center" name="title" placeholder="optional" value="<?php echo($experimentData->options->title); ?>"/></td>
                        </tr>
                        <tr>
                            <th>Instructions URL</th>
                            <td><input id="instructions" type="text" placeholder="optional" style="width:100%;text-align:center" name="instructions" value="<?php echo($experimentData->options->instructions); ?>"/></td>
                        </tr>
                        <tr>
                            <th># ratings</th>
                            <td>
                                <div id="slider-value"><?php echo $experimentData->options->ratings==1?"disabled":$experimentData->options->ratings; ?></div>
                                <div class="slidecontainer">
                                    <input type="range" min="1" max="12" value="<?php echo($experimentData->options->ratings); ?>" class="slider" id="ratings" name="ratings">
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <th>Allowed keys <i title="Comma-separated list of allowed keyboard key codes to continue" class="tooltip far fa-question-circle"></i></th>
                            <td><input id="keys" type="text" value="<?php echo($experimentData->options->keys); ?>" style="font-size:80%;color:#b7b7b7;width:60%;text-align:center;float: left;line-height: 23px;" name="keys"/><div id="generate-keys" class="button" style="border-width: 1px;height: 100%;margin: 0;display: block;float: right;line-height: 5px;margin-left: 2px;font-size: 80%;"/>Edit...</div>
                        </tr>
                        <tr>
                            <th>Randomize trials</th>
                            <td>
                                <select id="randomize" name="randomize" style="width:100%;font-size:16px;margin-top:0;height:26px;">
                                    <option value="all" title="Randomize all trials regardless of the condition" <?php echo strcmp($experimentData->options->randomize,"all")==0?"selected":""; ?>>Randomize all</option>
                                    <option value="consecutiverandom" title="Consecutive conditions, randomize trial order for each condition (only for conditions with same number of trials)" <?php echo strcmp($experimentData->options->randomize,"consecutiverandom")==0?"selected":""; ?>>Consecutive conditions, random trials</option>
                                    <option value="randomrandom" title="Block conditions and randomize their order, randomize trials inside the conditions" <?php echo strcmp($experimentData->options->randomize,"randomrandom")==0?"selected":""; ?>>Random blocks, random trials</option>
                                    <option value="keeprandom" title="Block conditions and keep their order, randomize trials inside the conditions" <?php echo strcmp($experimentData->options->randomize,"keeprandom")==0?"selected":""; ?>>Ordered blocks, random trials</option>
                                    <option value="randomkeep" title="Block conditions and randomize their order, keep trial order inside the conditions" <?php echo strcmp($experimentData->options->randomize,"randomkeep")==0?"selected":""; ?>>Random blocks, ordered trials</option>
                                    <option value="keepkeep" title="Keep order for conditions and trials inside the conditions" <?php echo strcmp($experimentData->options->randomize,"keepkeep")==0?"selected":""; ?>>Do not randomize</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Multiple stimuli <i title="Behavior if several images are found in each stimulus folder" class="tooltip far fa-question-circle"></i></th>
                            <td>
                                <select id="multiple" name="multiple" style="font-size:16px;margin-top:0;height:26px;width:100%">
                                    <option value="first" title="Trial images will be displayed sequentially" <?php echo strcmp($experimentData->options->multiple,"first")==0?"selected":""; ?>>Sequential (default)</option>
                                    <option value="MAFC" title="Trial images will be shown in a 2D grid" <?php echo strcmp($experimentData->options->multiple,"MAFC")==0?"selected":""; ?>>MAFC (grid)</option>
                                    <option value="MAFCcircle" title="Trial images will be shown in a circle" <?php echo strcmp($experimentData->options->multiple,"MAFCcircle")==0?"selected":""; ?>>MAFC (circle)</option>
                                    <option value="3D" title="Trial images will be shown as a stack of 2D images" <?php echo strcmp($experimentData->options->multiple,"3D")==0?"selected":""; ?>>3D scroll</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th>Calibration interval <i title="Recalibration interval in minutes, set to empty or 0 to disable" class="tooltip far fa-question-circle"></i></th>
                            <td><input id="calibration" name="calibration" type="number" placeholder="calibration" style="width:100%;text-align:center" value="<?php echo($experimentData->options->calibration); ?>"/></td>
                        </tr>
                        <tr>
                            <th>Trial timeout (ms) <i title="In milliseconds, set to empty or 0 to disable" class="tooltip far fa-question-circle"></i></th>
                            <td><input id="timeout" name="timeout" type="text" placeholder="optional" style="width:100%;text-align:center" value="<?php echo($experimentData->options->timeout); ?>"/></td>
                        </tr>
                        <tr>
                            <td colspan="2"><input id="mark" type="checkbox" name="mark" style="width:100%;text-align:center" <?php echo strcmp($experimentData->options->mark,"true")==0?"checked":""; ?>/><label for="mark">Marks <i title="Allow double click to mark the stimulus" class="tooltip far fa-question-circle"></i></label> <input id="fixationGrid" name="fixationGrid" type="checkbox" style="width:100%;text-align:center" <?php echo strcmp($experimentData->options->fixationGrid,"true")==0?"checked":""; ?>/><label for="fixationGrid">Fixation Grid <i title="Activate to show a fixation grid and ask the participant which code they saw" class="tooltip far fa-question-circle"></i></label></td>
                        </tr>
                    </table>
                    <input id="password-edit" type="password" name="password" placeholder="repeat password"/><br>
                    <input type="submit" class="edit-experiment" value="Update" name="edit-experiment" title="Participants that already started will keep old options." disabled="disabled">
                </form>
            </div>

            <?php } //if password is given (below)?>
            
        </div>
    </div>
</body>

<?php } ?>
<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if(file_exists("../vendor/autoload.php"))
    require_once("../vendor/autoload.php");

require_once("functions.php");

use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

$myFile = "results/";

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


if(isset($_POST['results'])){
    $arr_data = $_POST['results'];
    
    $jsondata = json_decode($arr_data);
    $id=sanitize_id($jsondata->config->options->id);
    $myFile=$myFile.$id."/";

    $name=sanitize_participant($jsondata->name);
    //unset($jsondata->config);
    //echo("../".$myFile.$name.".pso");

    if($name!=""){
        $participant = json_decode(getFileCloud($myFile.$name."/".$name.".pso",$defaultBucket));
            
        putFileCloud($myFile.$name."/"."trial".($participant->continueFrom+1).".pso",json_encode($jsondata->data),$defaultBucket);

        $participant->continueFrom=$participant->continueFrom+1;
        $participant->config=$jsondata->config;
        $participant->sortIndexes=$jsondata->sortIndexes;
        $participant->conditionSequence=$jsondata->conditionSequence;
        $participant->trialSequence=$jsondata->trialSequence;

        putFileCloud($myFile.$name."/".$name.".pso",json_encode($participant),$defaultBucket);
    }
}else if(isset($_POST['participant'])){
    $arr_data = $_POST['participant'];
    
    $jsondata = json_decode($arr_data);
    $id=sanitize_id($jsondata->config->options->id);
    $myFile=$myFile.$id."/";

    $name=sanitize_participant($jsondata->name);
    
    //echo("../".$myFile.$name.".pso");

    if($name!=""){
        mkdir("../".$myFile.$name);
        //$participant = json_decode(getFileCloud($myFile.$name.".pso",$defaultBucket));
        putFileCloud($myFile.$name."/".$name.".pso",json_encode($jsondata),$defaultBucket);
    }
}

?>
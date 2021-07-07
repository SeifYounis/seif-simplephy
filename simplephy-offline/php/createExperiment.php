<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if(file_exists("../vendor/autoload.php"))
    require_once("../vendor/autoload.php");

require_once("functions.php");

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

if(isset($_POST['experiment-id']) && isset($_POST['title']) && isset($_POST['experiment-data'])){
    //echo($_POST['experiment-id']);
    $jsondata = json_decode($_POST['experiment-data']);
    $title=substr($_POST['title'],0,100);
    $id=sanitize_id($_POST['experiment-id'],0,100);
    if(strpos($id,".") == false){
        $result=Array("experiment-id"=>$id);
        if(!is_dir("../results/".$id)){
            mkdir("../results/".$id,0777);
            chmod("../results/".$id,0777);
        }
        file_put_contents("../results/".$id."/title.txt", $title);
        file_put_contents("../experiment/".$id.".json", json_encode($jsondata));

        if(!$offline_mode){
            $object = $defaultBucket->object("experiment/".$id.".json");
            if(!$object->exists()){ //we don't want to replace the file
                $defaultBucket->upload(json_encode($jsondata),
                [
                    'name' => "experiment/".$id.".json"
                ]);

                $defaultBucket->upload($title,
                [
                    'name' => "results/".$id."/title.txt"
                ]);
            }
        }
        echo json_encode($result);
    }
}elseif(isset($_POST['load-id']) && isset($_POST['participant-id'])){
    $id=sanitize_id($_POST['load-id']);
    $participant=sanitize_participant($_POST['participant-id']);
    if(strpos($id,".") == false){
        if(!is_dir("../results/".$id))
            mkdir("../results/".$id,0777);
        if(!is_dir("../results/".$id."/".$participant)){
            mkdir("../results/".$id."/".$participant,0777);
            chmod("../results/".$id."/".$participant,0777);
        }
        $participant=($_POST['participant-id']);
        echo getFileCloud("results/".$id."/".$participant."/".$participant.".pso",$defaultBucket);
    }
}elseif(isset($_POST['load-id'])){
    $id=sanitize_id($_POST['load-id']);
    if(strpos($id,".") == false){
        if(!is_dir("../results/".$id))
            mkdir("../results/".$id,0777);
        echo getFileCloud("experiment/".$id.".json",$defaultBucket);
    }
}
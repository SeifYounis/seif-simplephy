<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once("functions.php");

if(file_exists("../vendor/autoload.php"))
    require_once("../vendor/autoload.php");
elseif(file_exists("google-api-php-client-2.4.1/vendor/autoload.php"))
    require_once("google-api-php-client-2.4.1/vendor/autoload.php");

function initializeClient() {
    $private_key = base64_decode( getenv('client_secret') );
    $private_key = str_replace('\n', "\n", $private_key);

    $client_parameters = array(
        'client_email'        => getenv('client_email'),
        'signing_algorithm'   => 'HS256',
        'signing_key'         => $private_key
    );

    $client = new Google_Client( $client_parameters );
    $client->useApplicationDefaultCredentials();
    $client->setClientId( getenv('client_id') ); 
    //$client->setScopes(['https://www.googleapis.com/auth/analytics.readonly']);
    return $client;
}

if(file_exists("../credentials/credentials.json")){
    $client = new Google_Client();
    $client->setAuthConfig('../credentials/credentials.json');
}else{
    $client = initializeClient();
}
$client->addScope('https://www.googleapis.com/auth/drive.readonly');

$service = new Google_Service_Drive($client);

if(isset($_GET['id'])){
    $fileId=sanitize_id($_GET['id']);

    try{
        $file=$service->files->get($fileId, array('alt' => 'media'));
        header('Content-Type: application/octet-stream');
        header('Content-Type: ' . $file->getHeaders()["Content-Type"][0]);
        //header('Content-Disposition: attachment; filename='.basename($this->real_file));
        //header('Content-Disposition: attachment; filename=stimuli');
        header('Expires: 0');
        header('Pragma: public');
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
        //header('Content-Length: ' . get_real_size($this->real_file));
        header("Content-Description: File Transfer");
        //header('Content-Length: ' . $file->getFileSize());

        echo($file->getBody());
    }catch(Exception $e) {
        header("HTTP/1.0 404 Not Found");
    }
    /*$results = $service->files->get($fileId, array("alt" => "media"));

    if($results->getResponseHttpCode() == 200){
        print_r($results->getResponseBody());
    }*/
    //print_r(get_class_methods($file));
//print_r($file->getHeaders());


/*
    $httpRequest = new Google_HttpRequest($file->getDownloadUrl(), 'GET', null, null);
    $httpRequest = $service->getClient()->getAuth()->authenticatedRequest($httpRequest);
    if ($httpRequest->getResponseHttpCode() == 200) {
        return $httpRequest->getResponseBody();
    } else {
        // An error occurred.
        return null;
    }*/
    

}

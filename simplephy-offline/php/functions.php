<?php
//HELPER FUNCTIONS

function sanitize_id($string){
    return substr(preg_replace('/[^[:alnum:]\-_]/', '', $string),0,100);
}

function sanitize_participant($participant){
    $participant = strip_tags( $participant );
    // Preserve escaped octets.
    $participant = preg_replace( '|%([a-fA-F0-9][a-fA-F0-9])|', '---$1---', $participant );
    // Remove percent signs that are not part of an octet.
    $participant = str_replace( '%', '', $participant );
    // Restore octets.
    $participant = preg_replace( '|---([a-fA-F0-9][a-fA-F0-9])---|', '%$1', $participant );    

    // Kill entities.
    $participant = preg_replace( '/&.+?;/', '', $participant );
    $participant = str_replace( '.', '-', $participant );

    $participant = preg_replace( '/[^%a-zA-Z0-9 _-]/', '', $participant );
    //$participant = preg_replace( '/\s+/', '-', $participant );
    $participant = preg_replace( '|-+|', '-', $participant );
    $participant = trim( $participant, '-' );

    return $participant;
}

function getFileCloud($filename,$defaultBucket){
    if($defaultBucket!=null){
        $object=$defaultBucket->object($filename);
        if($object->exists()){
            $object->downloadToFile("../".$filename);
            return file_get_contents("../".$filename);
        }
    }

    if(file_exists("../".$filename)){
        return file_get_contents("../".$filename);
    }else{
        return false;
    }
}

function putFileCloud($filename,$data,$defaultBucket){
    
    file_put_contents("../".$filename, $data);

    if($defaultBucket!=null){
        $object = $defaultBucket->object($filename);
        $defaultBucket->upload($data,
        [
            'name' => $filename
        ]);
    }
}


function recursive_implode(array $array, $glue = ',', $include_keys = false, $trim_all = true){
	$glued_string = '';

	// Recursively iterates array and adds key/value to glued string
	array_walk_recursive($array, function($value, $key) use ($glue, $include_keys, &$glued_string)
	{
		$include_keys and $glued_string .= $key.$glue;
		$glued_string .= $value.$glue;
	});

	// Removes last $glue from string
	strlen($glue) > 0 and $glued_string = substr($glued_string, 0, -strlen($glue));

	// Trim ALL whitespace
	$trim_all and $glued_string = preg_replace("/(\s)/ixsm", '', $glued_string);

	return (string) $glued_string;
}


function calculate_time_span($seconds)
{  
	$year = floor($seconds /31556926);
	$months = floor($seconds /2629743);
	$week=floor($seconds /604800);
	$day = floor($seconds /86400); 
	$hours = floor($seconds / 3600);
	$mins = floor(($seconds - ($hours*3600)) / 60); 
	$secs = floor($seconds % 60);
	 if($seconds < 60) $time = $secs." seconds";
	 else if($seconds < 3600 ) $time =($mins==1)?$mins." minute":$mins." minutes";
	 else if($seconds < 86400) $time = ($hours==1)?$hours." hour":$hours." hours";
	 else if($seconds < 604800) $time = ($day==1)?$day." day":$day." days";
	 else if($seconds < 2629743) $time = ($week==1)?$week." week":$week." weeks";
	 else if($seconds < 31556926) $time =($months==1)? $months." month":$months." months";
	 else $time = ($year==1)? $year." year":$year." years";
	return $time." ago"; 
} 

function recursiveDelete($str) {
    if (is_file($str)) {
        return @unlink($str);
    }
    elseif (is_dir($str)) {
        $scan = glob(rtrim($str,'/').'/*');
        foreach($scan as $index=>$path) {
            recursiveDelete($path);
        }
        return @rmdir($str);
    }
}

function checkRewrite(){
    if(isset($_SERVER['SCRIPT_URI'])){
        $url=explode("/",$_SERVER['SCRIPT_URI']);

        $url=array_slice($url,0,count($url)-2);
        $urltest=implode("/",$url)."/results";
        $context  = stream_context_create(array('http' =>array('method'=>'HEAD')));

        $fd = fopen($urltest, 'rb', false, $context);

        if (strpos(stream_get_meta_data($fd)["wrapper_data"][0],"301")!=false)
            $r=true;
        else
            $r=false;

        fclose($fd);
    }else
        $r=true;
    return $r;
}

function compress_folder($origin,$destination,$extension){

    $zip = new ZipArchive;
    if ($zip->open($destination, ZipArchive::CREATE | ZipArchive::OVERWRITE) === TRUE) {
        $zip->setArchiveComment('Created with SimplePhy.');
        $rootPath = realpath($origin);
        // Create recursive directory iterator
        /** @var SplFileInfo[] $files */
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($rootPath),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file)
        {
            // Skip directories (they would be added automatically)
            if (!$file->isDir())
            {
                // Get real and relative path for current file
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($rootPath) + 1);

                // Add current file to archive
                if(strpos($file->getFilename(),$extension)!==false)
                    $zip->addFile($filePath, $relativePath);
            }
        }

        // Zip archive will be created only after closing object
        $zip->close();
    }
}
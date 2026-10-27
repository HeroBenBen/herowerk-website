<?php
declare(strict_types=1);
require_once __DIR__.'/../api/rechner-engine.php';
$jobs=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);$out=[];
foreach($jobs as $job){try{$mode=$job['mode']??'core';$value=match($mode){'foerderung'=>hw_foerderung($job['query'],$job['sheets']),'kostenvergleich'=>hw_kostenvergleich($job['query'],$job['sheets']),'parameter'=>hw_kv_kostenparameter($job['sheets']),'bio'=>hw_kv_bio_stand($job['stufen']),'map'=>hw_kv_map_request($job['query'],$job['params']),'bootstrap'=>hw_kv_bootstrap($job['sheets']),default=>hw_kv_calculate($job['inputs'],$job['params'])};$out[]=['value'=>$value];}catch(Throwable $e){$out[]=['error'=>$e->getMessage()];}}
echo json_encode($out,JSON_THROW_ON_ERROR|JSON_PRESERVE_ZERO_FRACTION);

<?php

if (!$_POST['textarea']) {
	echo json_encode(array('error_fields' => array('textarea' => "not true")));
} else {
	echo json_encode(array('success' => true, 'success_fields' => array('textarea'), 'msg' => true));
}

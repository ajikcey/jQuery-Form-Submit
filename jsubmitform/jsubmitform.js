/*
 Parameters:
 debug           - show debug info (default = false)
 error           - show error info (default = true)
 luck            - show success info (default = true)
 animate         - show loading animate (default = true)
 handle          - handle request (default = false)
 auto            - automatic sending request when the field changes (default = false)
 validate        - array validate: "field", "required", "msg", <function> (order is not important)

 Functions:
 before({ form, dataout });                 - if return "false" execution stops
 noresponse({ form, dataout });             - no answer from server
 after({ form, dataout });
 success({ form, dataout, datain });
 success_field({ form, dataout, field });
 error_field({ form, dataout, field });

 Handle request functions:
 incorrect_data({ form, dataout, datain });   - if JSON answer not consist "success" or "success == false"
 -                                              if JSON answer consist "field" and no "success", call "error_field"
 correct_data({ form, dataout, datain });
 error_data({ form, dataout, datain });

 Elements:
 #jsf_error      - element for error/debug info (alert() if there is no)
 #jsf_luck       - element for success info (alert() if there is no)
 #jsf_animate    - element for loading animate

 Attributes:
 jsf_necessary   - required fields and value
 */


// entry point for several forms
function jsubmitform(forms, params) {

    forms.each(function () {
        jsubmitform_once($(this), params);
    });
}


// entry point for one form
function jsubmitform_once(form, params) {

    // validation & default
    init();

    // submit
    form.on('submit', jsf_main_handle);

    // auto
    if (params.auto) {
        form.find('*').on('change', jsf_main_handle);
    }


    // !!!!!!! MAIN HANDLE !!!!!!!
    function jsf_main_handle() {
        if (params.error) {
            hideel(form.find('#jsf_error'));
        }
        if (params.luck) {
            hideel(form.find('#jsf_luck'));
        }

        if (necessary() === false || validate() === false) return false;

        // !!! dataout !!!
        var dataout = form.serializeObject();

        // before
        if (callf(params.before, {form: form, dataout: dataout}) == false) return false;

        // *befor desabled form necessary save data,
        // because no access to disabled elements
        var serialize = form.serialize();

        // desabled form
        form.find('*').prop("disabled", true);

        // show animate
        showani();

        // ajax
        $.ajax({
            type: form.attr('method'),
            url: form.attr('action'),
            data: serialize,
            success: function (data) {

                if (params.handle) {
                    // handle request
                    jsf_handle_request({form: form, dataout: dataout, datain: data});
                } else {
                    // success
                    callf(params.success, {form: form, dataout: dataout, datain: data});
                    // show success data
                    showlck(form.find('#jsf_luck'), data);
                }

            },
            error: function () {
                // debug
                showdeb(form.find('#jsf_error'), 'debug - error');

                // noresponse
                callf(params.noresponse, {form: form, dataout: dataout});
            }
        }).always(function () {
            // after
            callf(params.after, {form: form, dataout: dataout});

            // enbled form
            form.find('*').prop("disabled", false);

            // hide animate
            hideel(form.find('#jsf_animate'));
        });

        return false;
    }


    // handle request
    function jsf_handle_request(obj) {
        try {
            var o_data = $.parseJSON(obj.datain);
            if (typeof(o_data.success) != 'undefined' && o_data.success != false) {
                // correct_data
                callf(params.correct_data, {form: form, dataout: obj.dataout, datain: o_data});

                showlck(form.find('#jsf_luck'), o_data.success);
            } else {
                // incorrect_data
                callf(params.incorrect_data, {form: form, dataout: obj.dataout, datain: o_data});

                // error_field
                if (o_data.field) {
                    callf(params.error_field, {
                        form: form, dataout: obj.dataout, field: form.find('[name="' + o_data.field + '"]')
                    });
                }

                showerr(form.find('#jsf_error'), o_data.error);
            }
        } catch (e) {
            // error_data
            callf(params.error_data, {form: form, dataout: obj.dataout, datain: o_data});

            // debug
            showdeb(form.find('#jsf_error'), 'debug - incorrect data');
        }
    }


    // call function "f" this parameters "p" as object
    function callf(f, p) {
        if (f && typeof(f) === "function") {
            return f(p);
        }
        return true;
    }


    // show animate
    function showani() {
        if (params.animate) {
            showel(form.find('#jsf_animate'), '<div id="facebookG">' +
                '<div id="blockG_1" class="facebook_blockG"></div>' +
                '<div id="blockG_2" class="facebook_blockG"></div>' +
                '<div id="blockG_3" class="facebook_blockG"></div></div>');
        }
    }


    // show error
    function showerr(where, what) {
        if (params.error === true) {
            if (where.length > 0) {
                showel(where, what);
            } else {
                alert(what);
            }
        }
    }


    // show luck
    function showlck(where, what) {
        if (params.luck === true) {
            if (where.length > 0) {
                showel(where, what);
            } else {
                alert(what);
            }
        }
    }


    // show debug
    function showdeb(where, what) {
        if (params.debug === true) {
            if (where.length > 0) {
                showel(where, what);
            } else {
                alert(what);
            }
        }
    }


    // show element "what" in "where"
    function showel(where, what) {
        where.html(what).show();
    }


    // hide element
    function hideel(where) {
        where.html("").hide();
    }


    // default
    function init() {
        // validation
        if (!form || typeof(form) != "object") {
            return false;
        }
        // default
        if (!params || typeof(params) != "object") {
            params = {};
        }
        if (typeof(params.debug) != "boolean") {
            params.debug = false;
        }
        if (typeof(params.error) != "boolean") {
            params.error = true;
        }
        if (typeof(params.luck) != "boolean") {
            params.luck = true;
        }
        if (typeof(params.animate) != "boolean") {
            params.animate = true;
        }
        if (typeof(params.handle) != "boolean") {
            params.handle = false;
        }
        if (typeof(params.auto) != "boolean") {
            params.auto = false;
        }
    }


    /*
     Description:   FORM TO OBJECT
     Source:    http://css-tricks.com/snippets/jquery/serialize-form-to-json/
     Using:     $('form').serializeObject();
     Return:    (object) { name: 'Alex', gender: 'm' }
     */
    $.fn.serializeObject = function () {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function () {
            if (o[this.name]) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };


    // necessary fields
    function necessary() {
        var dataout = form.serializeObject();

        var err_b = false;
        form.find('[jsf_necessary]').each(function () {

            // if not filled in the required fields, or not valid
            if ((( $(this).prop('type') == "radio" || $(this).prop('type') == "checkbox" ) &&
                ( form.find('[name="' + $(this).prop('name') + '"]:checked').length < 1 )) ||
                ( !$(this).val() )) {

                // error
                showerr(form.find('#jsf_error'), $(this).attr("jsf_necessary"));

                callf(params.error_field, {form: form, dataout: dataout, field: $(this)});

                err_b = true;
                return false;
            }

            callf(params.success_field, {form: form, dataout: dataout, field: $(this)});
        });
        if (err_b) return false;
    }


    // validate fields
    function validate() {
        var dataout = form.serializeObject();

        var err_b = false;
        if (typeof(params.validate) === 'object') {
            /*
             index - name field
             value - object: field, required, msg and <function>
             */
            $.each(params.validate, function (index, value) {
                if (typeof(value) === 'object') {

                    // if required OR val
                    if (value.required == true || form.find('[name="' + value.field + '"]').val()) {

                        if (Object.keys(value).length > 3) {
                            /*
                             v_index - field, required, msg or <function>
                             v_value - value this index
                             */
                            $.each(value, function (v_index, v_value) {

                                if (v_index != 'msg' && v_index != 'required' && v_index != 'field') {

                                    if (valid_actions[v_index]({
                                        field: form.find('[name="' + value.field + '"]'), value: v_value
                                    }) === false) {

                                        // error
                                        showerr(form.find('#jsf_error'), value.msg);

                                        callf(params.error_field, {
                                            form: form, dataout: dataout, field: form.find('[name="' + value.field + '"]')
                                        });

                                        err_b = true;
                                        return false;
                                    }
                                }

                            });
                            if (err_b) return false;

                        } else if (!form.find('[name="' + value.field + '"]').val()) {
                            // error
                            showerr(form.find('#jsf_error'), value.msg);

                            callf(params.error_field, {
                                form: form, dataout: dataout, field: form.find('[name="' + value.field + '"]')
                            });

                            err_b = true;
                            return false;
                        }
                    }
                }
            });
        }
        if (err_b) return false;
    }


    // !!! validation functions !!!

    var valid_actions = {
        minlength: function (obj) {
            var expr = new RegExp('^\\S{' + obj.value + ',}$', 'ig');

            var str = obj.field.val();
            if (str.search(expr) == -1) return false;
        },
        maxlength: function (obj) {
            var expr = new RegExp('^\\S{1,' + obj.value + '}$', 'ig');

            var str = obj.field.val();
            if (str.search(expr) == -1) return false;
        },
    };

    function debug(obj) {
        console.log('!!! DEBUG !!!');
        console.log(obj);
    }
}

//// !!! validation functions !!!
//
//// validation phone 9 (999) 999-99-99
//function jsf_valid_phone(val, error) {
//    if (val.search(/\d \(\d{3}\) \d{3}-\d{2}-\d{2}$/) == -1) {
//        // error
//        showerr(form.find('#jsf_error'), error);
//        return false;
//    }
//}
//


// Source: http://habrahabr.ru/post/27170/
//
//var actions = {
//    someFunc: function(params) {
//        ...
//    },
//    goodFunc: function(params) {
//        ...
//    }
//};
//
//// это название функции допустим переданное в ответе на AJAX-запрос
//var funcName = 'someFunc';
//
//// а это параметры функции переданные все в том же ответе
//var funcParams = {title: "Test Title", content: "Test Content"}
//
//// вызываем функцию
//actions[funcName](funcParams);
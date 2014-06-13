/*
 Parameters:
 error           - show error info (default = true) (if not find #jsf_error in form then alert())
 luck            - show success info (default = true) (if not find #jsf_luck in form then alert())
 handle          - handle request (default = false)
 auto            - automatic sending request when the field changes (default = false)
 validate        - objects: "field": "array functions"

 Functions:
 before({ form, dataout });                 - if return "false" execution stops
 after({ form, dataout });
 success({ form, dataout, datain });
 success_field({ form, dataout, field });
 error_field({ form, dataout, field });

 Handle request functions:
 incorrect_data({ form, dataout, datain });   - if JSON answer not consist "success" or "success == false"
 -                                              if JSON answer consist "field" and no "success", call "error_field"
 correct_data({ form, dataout, datain });

 Elements:
 #jsf_error      - element for error info (alert() if there is no)
 #jsf_luck       - element for success info (alert() if there is no)

 Attributes:
 jsf_necessary   - required fields and value
 */


// entry point for several forms
function jsubmitform(forms, params) {

    forms.each(function () {
        jsubmitform_once($(this), params);
    });


    function jsubmitform_once(form, params) {

        // default
        init();

        // submit
        form.on('submit', jsf_main_handle);

        // auto
        if (params.auto) {
            form.find('*').on('change', jsf_main_handle);
        }


        // !!!!!!! MAIN HANDLE !!!!!!!
        function jsf_main_handle() {
            if (params.error && form.find('#jsf_error')) {
                hideel(form.find('#jsf_error'));
            }
            if (params.luck && form.find('#jsf_luck')) {
                hideel(form.find('#jsf_luck'));
            }

            // !!! dataout !!!
            var dataout = form.serializeObject();

            if (necessary(dataout) === false) return false;
            if (validate(dataout) === false) return false;

            // before
            if (callf(params.before, {form: form, dataout: dataout}) == false) return false;

            // *befor desabled form necessary save data,
            // because no access to data of disabled elements
            var serialize = form.serialize();

            // desabled form
            form.find('*').prop("disabled", true);

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
                    // console.log('jsubmitform - no response from server');
                    showerr(form.find('#jsf_error'), 'no response from server');
                }
            }).always(function () {
                // after
                callf(params.after, {form: form, dataout: dataout});

                // enbled form
                form.find('*').prop("disabled", false);
            });

            return false;
        }


        // necessary fields
        function necessary(dataout) {

            var err_b = false;
            form.find('[jsf_necessary]').each(function () {

                // if not filled in the required fields, or not valid
                if (!dataout[$(this).prop('name')]) {

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
        function validate(dataout) {
            var err_b = false;

            if (typeof(params.validate) === 'object') {
                /*
                 value - object: field: <functions>
                 */
                $.each(params.validate, function (index, value) {
                    if (typeof(value) === 'object') {

                        /*
                         f_value - object: name(function), arg, msg
                         */
                        $.each(value, function (f_index, f_value) {
                            if (typeof(f_value) === 'object') {

                                // call validation function
                                if (valid_actions[f_value.name]({
                                    value: dataout[index], test: f_value.arg
                                }) === false) {

                                    // error
                                    showerr(form.find('#jsf_error'), f_value.msg);

                                    callf(params.error_field, {
                                        form: form,
                                        dataout: dataout,
                                        field: form.find('[name="' + index + '"]')
                                    });

                                    err_b = true;
                                    return false;
                                }
                            }
                        });
                        if (err_b) return false;

                        callf(params.success_field, {
                            form: form, dataout: dataout, field: form.find('[name="' + index + '"]')
                        });
                    }
                });
            }
            if (err_b) return false;
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
                showerr(form.find('#jsf_error'), 'incorrect data');
            }
        }


        // call function "f" this parameters "p" as object
        function callf(f, p) {
            if (f && typeof(f) === "function") {
                return f(p);
            }
            return true;
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
            if (typeof(params.error) != "boolean") {
                params.error = true;
            }
            if (typeof(params.luck) != "boolean") {
                params.luck = true;
            }
            if (typeof(params.handle) != "boolean") {
                params.handle = false;
            }
            if (typeof(params.auto) != "boolean") {
                params.auto = false;
            }
            if (typeof(params.validate) != "object") {
                params.validate = [];
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


        // !!! validation functions !!!
        var valid_actions = {

            minlength: function (obj) {
                var expr = new RegExp('^\\S{' + obj.test + ',}$', 'ig');

                var str = obj.value;
                if (str.search(expr) == -1) return false;
            },

            maxlength: function (obj) {
                var expr = new RegExp('^\\S{1,' + obj.test + '}$', 'ig');

                var str = obj.value;
                if (str.search(expr) == -1) return false;
            },

            regexp: function (obj) {
                var expr = obj.test;

                var str = obj.value;
                if (str.search(expr) == -1) return false;
            },

            phone: function (obj) {
                var expr = /^\d{1,12}\s?(\(\d{1,5}\))?\s?\d{0,5}(-)?\d{0,5}(-)?\d{0,5}$/;

                var str = obj.value;
                if (str.search(expr) == -1) return false;
            },


            email: function (obj) {
                var expr = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+\.[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

                var str = obj.value;
                if (str.search(expr) == -1) return false;
            },

        }
    }
}
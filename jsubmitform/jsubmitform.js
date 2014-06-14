/*
 Parameters:
 showerror          - show error info (default = true) (if not find #jsf_error in form then alert())
 showsuccess        - show success info (default = true) (if not find #jsf_success in form then alert())
 handle             - handle request (default = false)
 auto               - automatic sending request when the field changes (default = false)
 validate           - objects: "field": "array functions"

 Functions:
 before({ form, dataout });                 - if return "false" execution stops
 after({ form, dataout });
 success({ form, dataout, datain });
 error({ form, dataout, success_fields, error_fields });

 Elements:
 #jsf_error      - element for error info (alert() if there is no)
 #jsf_success       - element for success info (alert() if there is no)

 Attributes:
 jsf_necessary   - required fields and value
 */

// console.log('debug');

// entry point for several forms
function jsubmitform(forms, params) {
    var errors = "no response from server;incorrect data".split(";");


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
            if (params.showerror && form.find('#jsf_error')) hideel(form.find('#jsf_error'));

            if (params.showsuccess && form.find('#jsf_success')) hideel(form.find('#jsf_success'));

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
                        showscc(form.find('#jsf_success'), data);
                    }

                },
                error: function () {
                    // debug
                    showerr(form.find('#jsf_error'), errors[0]);
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
            var suc = [];
            var err = [];
            var err_b = false;

            form.find('[jsf_necessary]').each(function () {

                // if not filled in the required fields, or not valid
                if (!dataout[$(this).prop('name')]) {
                    err_b = true;
                    err.push({field: $(this), msg: $(this).attr("jsf_necessary")});
                } else {
                    suc.push({field: $(this)});
                }
            });

            if (err[0]) {
                showerr(form.find('#jsf_error'), err[0].msg);
            }

            callf(params.error, {
                form: form,
                dataout: dataout,
                error_fields: err,
                success_fields: suc
            });

            if (err_b) return false;
        }


        // validate fields
        function validate(dataout) {
            var suc = [];
            var err = [];
            var err_b = false;

            if (typeof(params.validate) === 'object') {

                // value - object: field: <functions>
                $.each(params.validate, function (index, value) {
                    if (typeof(value) === 'object') {

                        // foreach functions per field
                        var err_c = false;
                        $.each(value, function (f_index, f_value) {
                            if (typeof(f_value) === 'object') {

                                // call validation function (name function)
                                if (valid_actions[f_value.name]({
                                    value: dataout[index], test: f_value.arg}) === false) {


                                    err.push({
                                        field: form.find('[name="' + index + '"]'),
                                        msg: f_value.msg
                                    });

                                    err_b = true;
                                    err_c = true;
                                    return false;
                                }
                            }
                        });
                        if (!err_c) suc.push({field: form.find('[name="' + index + '"]')});
                    }
                });
            }

            if (err[0]) {
                showerr(form.find('#jsf_error'), err[0].msg);
            }

            callf(params.error, {
                form: form,
                dataout: dataout,
                error_fields: err,
                success_fields: suc
            });

            if (err_b) return false;
        }


        // handle request
        function jsf_handle_request(obj) {
            var suc = [];
            var err = [];

            try {
                var o_data = $.parseJSON(obj.datain);

                if (o_data.error_fields) {
                    $.each(o_data.error_fields, function (index, value) {
                        err.push({
                            field: form.find('[name="' + index + '"]'),
                            msg: value
                        });
                    });
                }

                if (o_data.success_fields) {
                    $.each(o_data.success_fields, function (index, value) {
                        suc.push({
                            field: form.find('[name="' + value + '"]')
                        });
                    });
                }

                // error_fields
                callf(params.error, {
                    form: form,
                    dataout: obj.dataout,
                    error_fields: err,
                    success_fields: suc
                });

                if (o_data.success) {

                    // success
                    callf(params.success, {form: form, dataout: obj.dataout, datain: o_data});

                    if (o_data.msg) showscc(form.find('#jsf_success'), o_data.msg);
                } else {
                    if (err[0]) showerr(form.find('#jsf_error'), err[0].msg);
                }


            } catch (e) {
                showerr(form.find('#jsf_error'), errors[1]);
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
            if (params.showerror === true) {
                if (where.length > 0)
                    showel(where, what);
                else
                    alert(what);
            }
        }


        // show success
        function showscc(where, what) {
            if (params.showsuccess === true) {
                if (where.length > 0)
                    showel(where, what);
                else
                    alert(what);
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
            if (!form || typeof(form) != "object")
                return false;
            // default
            if (!params || typeof(params) != "object")
                params = {};
            if (typeof(params.showerror) != "boolean")
                params.showerror = true;
            if (typeof(params.showsuccess) != "boolean")
                params.showsuccess = true;
            if (typeof(params.handle) != "boolean")
                params.handle = false;
            if (typeof(params.auto) != "boolean")
                params.auto = false;
            if (typeof(params.validate) != "object")
                params.validate = [];
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
                if (obj.test && obj.value) {
                    if (obj.value.length < obj.test) return false;
                } else {
                    return false;
                }
            },
            maxlength: function (obj) {
                if (obj.test && obj.value) {
                    if (obj.value.length > obj.test) return false;
                } else {
                    return false;
                }
            },
            regexp: function (obj) {
                if (obj.test && obj.value && typeof(obj.value) == "string") {
                    if (obj.value.search(obj.test) == -1) return false;
                } else {
                    return false;
                }
            },
            phone: function (obj) {
                if (obj.value && typeof(obj.value) == "string") {
                    var expr = /^\d{1,12}\s?(\(\d{1,5}\))?\s?\d{0,5}(-)?\d{0,5}(-)?\d{0,5}$/;

                    if (obj.value.search(expr) == -1) return false;
                } else {
                    return false;
                }
            },
            email: function (obj) {
                if (obj.value && typeof(obj.value) == "string") {
                    var expr = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+\.[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

                    if (obj.value.search(expr) == -1) return false;
                } else {
                    return false;
                }
            },
        }
    }
}
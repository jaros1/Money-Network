// Uploadable class from ZeroMePlus http://127.0.0.1:43110/1Lj1oPcN7oZQL8HkS5KbkzQuKqs42zQWY6/

(function() {
    var Uploadable,
        bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
        extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
        hasProp = {}.hasOwnProperty;

    Uploadable = (function(superClass) {
        extend(Uploadable, superClass);

        function Uploadable(handleSave) {
            this.handleSave = handleSave;
            this.render = bind(this.render, this);
            this.handleUploadClick = bind(this.handleUploadClick, this);
            this.resizeImage = bind(this.resizeImage, this);
            this.storeNode = bind(this.storeNode, this);
            this.node = null;
            this.resize_w = 50;
            this.resize_h = 50;
        }

        Uploadable.prototype.storeNode = function(node) {
            return this.node = node;
        };

        Uploadable.prototype.resizeImage = function(file, width, height, cb) {
            var image, resizer;
            image = new Image();
            resizer = function(i) {
                var cc, cc_ctx;
                cc = document.createElement("canvas");
                cc.width = i.width / 2;
                cc.height = i.height / 2;
                cc_ctx = cc.getContext("2d");
                cc_ctx.drawImage(i, 0, 0, cc.width, cc.height);
                return cc;
            };
            image.onload = (function(_this) {
                return function() {
                    var canvas, canvas_quant, ctx, image_base64uri, optimizer, quant;
                    canvas = document.createElement("canvas");
                    canvas.width = width;
                    canvas.height = height;
                    ctx = canvas.getContext("2d");
                    ctx.fillStyle = "#FFF";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    while (image.width > width * 2) {
                        image = resizer(image);
                    }
                    ctx.drawImage(image, 0, 0, width, height);
                    quant = new RgbQuant({
                        colors: 128,
                        method: 1
                    });
                    quant.sample(canvas);
                    quant.palette(true);
                    canvas_quant = drawPixels(quant.reduce(canvas), width);
                    optimizer = new CanvasTool.PngEncoder(canvas_quant, {
                        bitDepth: 8,
                        colourType: CanvasTool.PngEncoder.ColourType.TRUECOLOR
                    });
                    image_base64uri = "data:image/png;base64," + btoa(optimizer.convert());
                    if (image_base64uri.length > 2200) {
                        _this.log("PNG too large (" + image_base64uri.length + " bytes), convert to jpg instead");
                        image_base64uri = canvas.toDataURL("image/jpeg", 0.8);
                    }
                    _this.log("Size: " + image_base64uri.length + " bytes");
                    return cb(image_base64uri);
                };
            })(this);
            image.onerror = (function(_this) {
                return function(e) {
                    _this.log("Image upload error", e);
                    return cb(null);
                };
            })(this);
            return image.src = URL.createObjectURL(file);
        };

        Uploadable.prototype.handleUploadClick = function(e) {
            var input, script;
            script = document.createElement("script");
            script.src = "js-external/pngencoder.js";
            document.head.appendChild(script);
            input = document.createElement('input');
            input.type = "file";
            input.addEventListener('change', (function(_this) {
                return function(e) {
                    return script.onload = _this.resizeImage(input.files[0], _this.resize_w, _this.resize_h, function(image_base64uri) {
                        _this.handleSave(image_base64uri);
                        return input.remove();
                    });
                };
            })(this));
            input.click();
            return false;
        };

        Uploadable.prototype.render = function(body) {
            return h("div.uploadable", h("a.icon.icon-upload", {
                href: "#Upload",
                onclick: this.handleUploadClick
            }), body());
        };

        return Uploadable;

    })(Class);

    window.Uploadable = Uploadable;

}).call(this);

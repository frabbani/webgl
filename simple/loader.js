var loader = loader || {};

var models = {};

function createAttributes(dataVertices) {
    var attributes = [];
    if (typeof dataVertices.layout === 'undefined' || typeof dataVertices.attributes === 'undefined') {
        console.log("error: no attributes and/or layout");
        return attributes;
    }
    var dataLayout = dataVertices.layout;
    var dataAttributes = dataVertices.attributes;
    var offset = 0;
    for (let i = 0; i < dataLayout.length; i++) {
        var index = dataLayout[i];  // name
        var attribute = {};
        attribute['index'] = index;
        for (let j = 0; j < dataAttributes.length; j++) {
            var dataAttribute = dataAttributes[j];
            if (typeof index == 'string' && index === dataAttribute.index) {
                var pitch = 0;
                var normalized = typeof dataAttribute.normalized === 'undefined' ?
                    false :
                    dataAttribute.normalized == 'yes' ? true : false;
                attribute['size'] = dataAttribute.size;
                if ('float' == dataAttribute.type) {
                    attribute['type'] = gl.FLOAT;
                    attribute['normalized'] = false;
                    pitch = 4;
                }
                else if ('uint8' == dataAttribute.type) {
                    attribute['type'] = gl.UNSIGNED_BYTE;
                    attribute['normalized'] = normalized;
                    pitch = 1;
                }
                else {
                    console.log(" - vertex attribute: IM WORKING ON IT!!!");
                }
                attribute['offset'] = offset;
                var numBytes = attribute['size'] * pitch;
                attribute['num_bytes'] = numBytes;
                attributes[i] = attribute;
                offset += numBytes;
            }
        }
    }
    console.log("layout:");
    for (const [k, v] of Object.entries(dataLayout)) {
        console.log("  *  " + `${k}: ${v}`);
    }
    console.log("# of attributes: ", attributes.length);
    for (var i = 0; i < attributes.length; i++) {
        let a = attributes[i];
        console.log(" + attribute: ", i);
        console.log("    . index: ", a.index);
        console.log("    . size: ", a.size);
        console.log("    . normalized: ", a.normalized);
        console.log("    . type: ", a.type);
        console.log("    . offset: ", a.offset);
    }
    return attributes;
}

function addModel(data) {
    var model = {};
    model['name'] = data.name;
    let dataIndices = data.indices;
    let dataVertices = data.vertices;
    if (typeof dataVertices == 'undefined' || typeof dataIndices == 'undefined')
        return {};
    if (typeof dataVertices.data == 'undefined')
        return {};

    model['num_vertices'] = dataVertices.total;
    console.log("# of vertices: ", model.num_vertices);
    model['attributes'] = createAttributes(dataVertices);
    let modelAttributes = model['attributes'];
    console.log("# of attributes (reiterated): ", modelAttributes.length);
    var stride = 0;
    for (var i = 0; i < modelAttributes.length; i++)
        stride += modelAttributes[i].num_bytes;
    model['vertex_stride'] = stride;
    console.log("vertex stride: ", model.vertex_stride);

    model['attributes-index'] = {};
    for (var i = 0; i < modelAttributes.length; i++)
        model['attributes-index'][modelAttributes[i].index] = i;

    model['vertex_data'] = new ArrayBuffer(model.vertex_stride * model.num_vertices);
    for (var i = 0; i < model.num_vertices; i++) {
        var view = new DataView(model.vertex_data, i * model.vertex_stride);
        var offset = 0;
        //console.log( "setting vertex  ", i );
        for (var j = 0; j < modelAttributes.length; j++) {
            let a = modelAttributes[j];
            var source = dataVertices.data[a.index][i];
            //console.log( " + setting attribute ", j );
            if (a.size == 1) {
                //console.log( "      [" + offset + "] ", source);
                if (gl.FLOAT == a.type) {
                    view.setFloat32(offset, source);
                    offset += 4;
                }
                else if (gl.UNSIGNED_BYTE == a.type) {
                    view.setUint8(offset, source);
                    offset++;
                }
            }
            else {
                for (var k = 0; k < a.size; k++) {
                    //console.log( "      [" + offset + "] ", source[k]);
                    if (gl.FLOAT == a.type) {
                        view.setFloat32(offset, source[k]);
                        offset += 4;
                    }
                    else if (gl.UNSIGNED_BYTE == a.type) {
                        view.setUint8(offset, source[k]);
                        offset++;
                    }
                }
            }
        }
    }
    /*
    for (var i = 0; i < model.num_vertices; i++) {
        var view = new DataView(model.vertex_data, i * model.vertex_stride);
        var offset = 0;
        console.log("vertex  ", i);
        for (var j = 0; j < modelAttributes.length; j++) {
            let a = modelAttributes[j];
            console.log(" + attribute ", j);
            if (a.size == 1) {
                if (gl.FLOAT == a.type) {
                    console.log("      [" + offset + "] ", view.getFloat32(offset));
                    offset += 4;
                }
                else if (gl.UNSIGNED_BYTE == a.type) {
                    console.log("      [" + offset + "] ", view.getUint8(offset));
                    offset++;
                }
            }
            else {
                for (var k = 0; k < a.size; k++) {
                    if (gl.FLOAT == a.type) {
                        console.log("      [" + offset + "] ", view.getFloat32(offset));
                        offset += 4;
                    }
                    else if (gl.UNSIGNED_BYTE == a.type) {
                        console.log("      [" + offset + "] ", view.getUint8(offset));
                        offset++;
                    }
                }
            }
        }
    }*/


    var source = new DataView(model.vertex_data);
    var numUint32s = model.vertex_stride / 4;
    var uint32s = [];
    var n = 0;
    for (var i = 0; i < model.num_vertices; i++) {
        var o = i * model.vertex_stride;
        for (var j = 0; j < numUint32s; j++)
            uint32s[n++] = source.getUint32(o + j * 4);
    }

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Uint32Array(uint32s), gl.STATIC_DRAW);
    model["vbo"] = vbo;

    var ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(dataIndices), gl.STATIC_DRAW);
    model["ibo"] = ibo;
    model["num_indices"] = dataIndices.length;

    models[data.name] = model;
}

loader.loadModels = async function (url) {
    if (typeof url === 'undefined')
        return;
    try {
        console.log("url: " + url);
        var resp = await fetch(url);
        if (!resp.ok) {
            throw new Error('Failed to read url "' + url + '"');
        }
        var jsonObj = JSON.parse(await resp.text());
        var count = jsonObj.models.length;
        console.log("# of models: " + count);
        for (let i = 0; i < count; i++) {
            var model = jsonObj.models[i];
            console.log("*** " + model.name + " ***");
            addModel(model);
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    catch (e) {
        console.error(e);
        return "";
    }
}

loader.getModel = function (name) {
    if (typeof name === 'undefined')
        return {};
    if (typeof models[name] === 'undefined')
        return {};

    let model = models[name];
    if (typeof model["vbo"] === 'undefined')
        return {};
    if (typeof model["ibo"] === 'undefined')
        return {};
    return model;
}

loader.validModel = function (model) {
    if (model === null)
        return false;
    if (typeof model === 'object') {
        if (typeof model["vbo"] !== 'undefined' &&
            typeof model["ibo"] !== 'undefined') {
            return true;
        }
    }
    return false;
}

loader.enableModelAttribute = function (model, index, loc) {
    if (typeof model === 'undefined')
        return;

    let map = model['attributes-index'];
    let attributes = model['attributes'];
    if (typeof map === 'undefined' || typeof attributes === 'undefined')
        return;
    no = map[index];
    if (typeof no !== 'undefined') {
        var a = attributes[no];
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, a.size, a.type, a.normalized, model.vertex_stride, a.offset);
        // TODO: vertexAttribIPointer
    }

}

var textures = {};

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

loader.loadTexture = function (name, url) {
    if (typeof name === 'undefined' || url === 'undefined')
        return;

    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Because images have to be downloaded over the internet
    // they might take a moment until they are ready.
    // Until then put a single pixel in the texture so we can
    // use it immediately. When the image has finished downloading
    // we'll update the texture with the contents of the image.
    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([255, 0, 255, 255]); // magenta (r,g,b,a)
    gl.texImage2D(
        gl.TEXTURE_2D,
        level,
        internalFormat,
        width,
        height,
        border,
        srcFormat,
        srcType,
        pixel,
    );
    textures[name] = texture;
    console.log("created texture '" + name + "' from url '" + url + "'");

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat,
            srcType,
            image,
        );

        // WebGL1 has different requirements for power of 2 images
        // vs. non power of 2 images so check if the image is a
        // power of 2 in both dimensions.
        if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
            // Yes, it's a power of 2. Generate mips.
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.GL_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.GL_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIP_FILTER, gl.GL_LINEAR_MIPMAP_LINEAR);
        } else {
            // No, it's not a power of 2. Turn off mips and set
            // wrapping to clamp to edge
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.GL_LINEAR);
        }
    };
    image.src = url;


    return texture;
}

loader.bindTexture = function (name, unit) {
    if (typeof textures["name"] === 'undefined')
        return;

}
/*
    // dataview example
    buf = new ArrayBuffer(5 * 10);
    for (var i = 0; i < 5; i++) {
      var view = new DataView(buf, 5 * i);
      view.setFloat32(0, 3.333 * i);
      view.setUint8(4, 1 << i);
    }
    
    for (var i = 0; i < 5; i++) {
        console.log( "index " + i );
        var view = new DataView(buf, 5 * i);
        console.log( " * " + view.getFloat32(0));
        console.log( " * " + view.getUint8(4));
    }


loader.loadModels = function (url) {
    if (typeof url === 'undefined')
        return;

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false); // false indicates a synchronous request
    xhr.send();
    if (xhr.status === 200) {
        //console.log(xhr.responseText);
        var jsonObj = JSON.parse(xhr.responseText);
        var count = jsonObj.models.length;
        console.log("# of models: " + count);
        for( let i = 0; i < count; i++ ){
            var model = jsonObj.models[i];
            console.log( " + " + model.name );
            addModel(model);
        }
    } else {
        console.error('url "' + url + '" request failed: ', xhr.status);
    }
}*/

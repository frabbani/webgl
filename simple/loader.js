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

    // console.log("    + attributes:");
    // for (const [k, v] of Object.entries(dataAttributes)) {
    //     console.log( "")
    //     for (const [kk, vv] of Object.entries(v)) {
    //         console.log("        *  " + `${kk}: ${vv}`);
    //     }
    // }
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
    var numFloats = model.vertex_stride / 4; 
    var ps = [];
    var n = 0;
    for( var i = 0; i < model.num_vertices; i++ ){
        var o = i * model.vertex_stride;
        for( var j = 0; j < numFloats; j++ )
            ps[n++] = source.getFloat32(o + j * 4);
    }

    var vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ps), gl.STATIC_DRAW);
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

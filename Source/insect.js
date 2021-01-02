// create initial constants

initialParameters = {
    'x': 0,
    'y': 1,
    'z': 0,
    'xLength': 1.5,
    'yLength': 1.5,
    'zLength': 1.5, 
    'xRotation': 0,
    'yRotation': 0,
    'zRotation': 0
}

initialLegRotations = {
    'root': [90, 0, 90],
    'leg-1-1': [40, 50, 0],
    'leg-2-1': [50, 70, 0],
    'leg-3-1': [-50, 70, 0],
    'leg-4-1': [-40, 50, 0],
    'leg-5-1': [40, -50, 0],
    'leg-6-1': [50, -70, 0],
    'leg-7-1': [-50, -70, 0],
    'leg-8-1': [-40, -50, 0],

    'leg-1-2': [30, 10, 0],
    'leg-2-2': [10, 0, 0],
    'leg-3-2': [-10, 0, 0],
    'leg-4-2': [-30, 10, 0],
    'leg-5-2': [30, -10, 0],
    'leg-6-2': [10, 0, 0],
    'leg-7-2': [-10, 0, 0],
    'leg-8-2': [-30, -10, 0],

    'leg-1-3': [40, -10, 0],
    'leg-2-3': [40, 0, 0],
    'leg-3-3': [30, 70, 0],
    'leg-4-3': [-40, -10, 0],
    'leg-5-3': [40, 10, 0],
    'leg-6-3': [40, 0, 0],
    'leg-7-3': [30, -70, 0],
    'leg-8-3': [-40, 10, 0],
}

// create global variables

var modelViewMatrix, projectionMatrix;

var modelViewMatrixLoc;

var vBuffer, nBuffer;

var lightPosition = vec4(1.0, 1.0, 1.0, 0.0 );
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialAmbient = vec4( 1.0, 0.0, 1.0, 1.0 );
var materialDiffuse = vec4( 1.0, 0.8, 0.0, 1.0 );
var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 100.0;

var ctm;
var ambientColor, diffuseColor, specularColor;

var tree;

var stack = [];

var rotation_direction = 0;

// Node class to represent any object drawn to canvas
class Node {
    constructor(name, parent, parameters, drawFunction){
        this.name = name;
        this.parent = parent;
        this.children = [];
        this.vertices = [];
        this.normals = [];
        this.rotations = [0,0,0];
        this.translate = [0,0,0];
        this.parameters = parameters;
        this.render = drawFunction;
        this.centerTranslate = [0,0,0]; 
    }

    addChild(child){
        this.children.push(child);
    }

    getChildren(){
        return this.childrens;
    }
}

// Tree class to implement a 3-D hierarchical model
class Tree {
    constructor(root){
        this.root = root;
        this.nodes = {};
        this.nodes['root'] = root;
    }

    addNode(node){
        this.nodes[node.name] = node;
    }

    updateTransformToSubtree(node, f){
        if (node == null) {
            return;
        }

        f(node);

        node.children.forEach((child, index) => {
           this.updateTransformToSubtree(child, f); 
        });
    }

    updateCurrentPostureString(node){
        if (node == null) return;
        for (var i = 0; i < 3; i++)
            currentPostureString += node.name + " " + i + " " + node.rotations[i] + ",";
        node.children.forEach((child, index) => {
            this.updateCurrentPostureString(child);
        });
    }

    resetPosture(node){
        if (node == null) return;
        for (var i = 0; i < 3; i++)
            node.rotations[i] = 0;
        node.children.forEach((child, index) => {
            this.resetPosture(child);
        });
    }

    traverseAndRender(node, currentModelViewMatrix){
       if(node == null) return; 
       
       currentModelViewMatrix = mult(currentModelViewMatrix, node.transform);
       modelViewMatrix = currentModelViewMatrix;
       node.render(node);
       
       node.children.forEach((child, index) => {
           this.traverseAndRender(child, currentModelViewMatrix); 
       }); 
    }
}

// main function to initiate program
window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );
    gl.enable( gl.DEPTH_TEST ); 
    
    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    
    gl.useProgram( program );


    initModel();

    var load_button = document.getElementById('load_button');
    load_button.addEventListener("click", function() {
        
        if (window.File && window.FileReader && window.FileList && window.Blob) {

            load_button.addEventListener('change', function() {
                let myFile = load_button.files[0];
                let fileReader = new FileReader();
                fileReader.onload = function() {
                    let result = JSON.parse(fileReader.result);

                    allPostures = result[0];

                    animationCounter = 0;
                    flag = 1;
                };

                fileReader.readAsText(myFile);
            });
        } else {
            alert("File System is not supported in this browser");
        }
    });

    // Load shaders and use the resulting shader program
    
    program = initShaders( gl, "vertex-shader", "fragment-shader" );    
    gl.useProgram( program );

    ambientProduct = mult(lightAmbient, materialAmbient);
    diffuseProduct = mult(lightDiffuse, materialDiffuse);
    specularProduct = mult(lightSpecular, materialSpecular);

    sliderInit();

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    normalMatrixLoc = gl.getUniformLocation( program, "normalMatrix" );

    projectionMatrix = ortho(-10, 10, -10, 10, -10, 10);
    gl.uniformMatrix4fv( gl.getUniformLocation(program, "projectionMatrix"),  false, flatten(projectionMatrix) );
    
    gl.uniform4fv( gl.getUniformLocation(program, 
       "ambientProduct"),flatten(ambientProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "diffuseProduct"),flatten(diffuseProduct) );
    gl.uniform4fv( gl.getUniformLocation(program, 
       "specularProduct"),flatten(specularProduct) );   
    gl.uniform4fv( gl.getUniformLocation(program, 
       "lightPosition"),flatten(lightPosition) );
    gl.uniform1f( gl.getUniformLocation(program, 
       "shininess"),materialShininess );

    render();
}

// initialization of the vertices and the normals of the 3d insect model
function initModel(){
    var rootNode = new Node('root', null, initialParameters, drawSphere);
    createSphere(rootNode);
    tree = new Tree(rootNode);

    for(var i=1; i <= 8; i++){
        var newLeg = createLeg(i, rootNode);
        rootNode.addChild(newLeg);
    }

    for(var i=1; i <= 2; i++){
        var newAntenna = createAntenna(i, rootNode);
        rootNode.addChild(newAntenna);
    }

    var lowerTorso = createLowerTorso(rootNode);
    rootNode.addChild(lowerTorso);

    var surface = createSurfaceForSpider(rootNode);
    //rootNode.addChild(surface);
}

// function to create leg models
function createLeg(legNumber, parent){

    var part1name = 'leg-'+ legNumber +'-1';
    var part2name = 'leg-'+ legNumber +'-2';
    var part3name = 'leg-'+ legNumber +'-3';
    var y = parent.parameters['yLength'];
    var y = (-y + ((legNumber-1)%4 * 2*y/3)) * 0.6;
    var radius = parent.parameters['xLength'];
    var x = Math.sqrt(Math.pow(radius,2) - Math.pow(y,2));

    part1Parameters = {
        'x': (x + parent.parameters['x']) * (legNumber > 4 ? -1 : 1) ,
        'y': y + parent.parameters['y'],
        'z': parent.parameters['z'],
        'xLength': parent.parameters['xLength']/4,
        'yLength': parent.parameters['yLength']/4,
        'zLength': parent.parameters['zLength']*2.5,
        'xRotation': initialLegRotations[part1name][0],
        'yRotation': initialLegRotations[part1name][1],
        'zRotation': initialLegRotations[part1name][2]
    }

    var legpart1 = new Node(part1name, parent, part1Parameters, drawCylinder);
    tree.addNode(legpart1);
    createCylinder(legpart1);

    legpart1.centerTranslate=[0, 0, -legpart1.parameters['zLength']/4];
    
    part2Parameters = {
        'x': legpart1.parameters['x'],
        'y': legpart1.parameters['y'],
        'z': legpart1.parameters['z'] + legpart1.parameters['zLength']/2,
        'xLength': part1Parameters['xLength']*0.8,
        'yLength': part1Parameters['yLength']*0.8,
        'zLength': part1Parameters['zLength']*1.25,
        'xRotation': initialLegRotations[part2name][0],
        'yRotation': initialLegRotations[part2name][1],
        'zRotation': initialLegRotations[part2name][2]
    }

    var legpart2 = new Node(part2name, legpart1, part2Parameters, drawCylinder);
    legpart1.addChild(legpart2);
    tree.addNode(legpart2);
    createCylinder(legpart2);

    legpart2.centerTranslate=[0, 0, -legpart2.parameters['zLength']/4];
    
    part3Parameters = {
        'x': legpart2.parameters['x'],
        'y': legpart2.parameters['y'],
        'z': legpart2.parameters['z'] + legpart2.parameters['zLength']/2,
        'xLength': part2Parameters['xLength']*0.8,
        'yLength': part2Parameters['yLength']*0.8,
        'zLength': part2Parameters['zLength']*2,
        'xRotation': initialLegRotations[part3name][0],
        'yRotation': initialLegRotations[part3name][1],
        'zRotation': initialLegRotations[part3name][2]
    }
    
    var legpart3 = new Node(part3name, legpart2, part3Parameters, drawCylinder);
    legpart2.addChild(legpart3);
    tree.addNode(legpart3);
    createCylinder(legpart3);

    legpart3.centerTranslate=[0, 0, -legpart3.parameters['zLength']/4];

    return legpart1;
}

// function to create antenna models
function createAntenna(antennaNumber, parent){
    var antennaName = 'antenna-'+ antennaNumber;
    var x = parent.parameters['yLength']/3;
    var radius = parent.parameters['zLength'];
    var y = Math.sqrt(Math.pow(radius,2) - Math.pow(x,2));
    antennaParameteres = {
        'x': parent.parameters['x'] + (x * (antennaNumber % 2 == 0 ? -1 : 1)),
        'y': parent.parameters['y'] + y,
        'z': parent.parameters['z'],
        'xLength': parent.parameters['yLength']/6,
        'yLength': parent.parameters['yLength']/6,
        'zLength': parent.parameters['zLength']*2,
        'xRotation': 110,
        'yRotation': -10 * (antennaNumber % 2 == 0 ? -1 : 1),
        'zRotation': 0      
    }

    var antenna = new Node(antennaName, parent, antennaParameteres, drawCylinder);
    tree.addNode(antenna);
    createCylinder(antenna);

    antenna.centerTranslate=[0, 0, antenna.parameters['zLength']/4];

    return antenna;
}

// function to create lower torso models
function createLowerTorso(parent) {
     connectorParameters = {
        'x': parent.parameters['x'],
        'y': parent.parameters['y'] - parent.parameters['yLength'] - parent.parameters['yLength']/3/2,
        'z': parent.parameters['z'],
        'xLength': parent.parameters['xLength']/2,
        'yLength': parent.parameters['yLength']/3,
        'zLength': parent.parameters['zLength'],
        'xRotation': 90,
        'yRotation': 0,
        'zRotation': 0
    }

    connectorPart = new Node("connectorPart", parent, connectorParameters, drawCylinder);
    tree.addNode(connectorPart);
    createCylinder(connectorPart);

    connectorPart.centerTranslate=[0, 0, 0];

    lowerTorsoParameters = {
        'x': connectorPart.parameters['x'],
        'y': connectorPart.parameters['y'],
        'z': connectorPart.parameters['z'] + connectorPart.parameters['yLength']*5.6 - connectorPart.parameters['yLength']*4,
        'xLength': connectorPart.parameters['yLength']*4,
        'yLength': connectorPart.parameters['yLength']*5,
        'zLength': connectorPart.parameters['yLength']*3,
        'xRotation': -90,
        'yRotation': 0,
        'zRotation': 0
    }

    lowerTorsoPart = new Node("lowerTorsoPart", connectorPart, lowerTorsoParameters, drawSphere);
    tree.addNode(lowerTorsoPart);
    createSphere(lowerTorsoPart);

    connectorPart.addChild(lowerTorsoPart);

    lowerTorsoPart.centerTranslate=[0, connectorPart.parameters['yLength']*4, 0] ;

    return connectorPart;
}

// function to create surface 
function createSurfaceForSpider(parent) {
    surfaceParameter = {
        'x': tree.nodes['root'].parameters['x'] -5,
        'y': tree.nodes['root'].parameters['y'] -5,
        'z': tree.nodes['root'].parameters['z'] -2,
        'xLength': 50,
        'yLength': 50,
        'zLength': 2,
        'xRotation': 0,
        'yRotation': 0,
        'zRotation': 0
    }

    var surface = new Node("surface", parent, surfaceParameter, drawSurface);
    tree.addNode(surface);
    createSurface(surface);

    return surface
}

var flag = 0;
// function to constantly call re-rendering for canvas
var render = function() {
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    gl.clearColor(0, 0, 1, 0.7);
    
    // hierarchically apply transform to all nodes
    tree.updateTransformToSubtree(tree.root, applyTransform);

    // hierarchically render all nodes
    modelViewMatrix = mat4();
    tree.traverseAndRender(tree.root, modelViewMatrix);
    
    // if walk checkbox checked run walk if flag is true run loaded postures
    if (document.getElementById('walk').checked) 
        renderAnimation(default_animString);
    else if (flag) {
        renderAnimation(allPostures);
    }

    requestAnimFrame(render);
}

// applies transform to the given node according to the node's parameters 
function applyTransform(node){
    node.transform = mat4();
    node.transform = mult(node.transform, translate(node.translate[0], node.translate[1], node.translate[2]));

    if (node.parent)
        node.transform = mult(node.transform, translate(node.parameters['x'] + node.parent.centerTranslate[0], node.parameters['y'] + node.parent.centerTranslate[1], node.parameters['z']+ node.parent.centerTranslate[2]));
    else
        node.transform = mult(node.transform, translate(node.parameters['x'], node.parameters['y'], node.parameters['z']));

    node.transform = mult(node.transform, rotate(node.parameters['xRotation'] + node.rotations[0], 1, 0, 0));
    node.transform = mult(node.transform, rotate(node.parameters['yRotation'] + node.rotations[1], 0, 1, 0));
    node.transform = mult(node.transform, rotate(node.parameters['zRotation'] + node.rotations[2], 0, 0, 1));

    node.transform = mult(node.transform, translate(-node.parameters['x'] - node.centerTranslate[0], -node.parameters['y'] - node.centerTranslate[1] , -node.parameters['z'] -node.centerTranslate[2]));
}

// draws the given vertices and normals according to the given drawing type by using GPU buffers
function draw(type, vertices, normals) {
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, 'vPosition');
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);
    gl.drawArrays(type, 0, vertices.length);
}

// draws the given node as a cylinder
function drawCylinder(node) {
    instanceMatrix = mult(modelViewMatrix, translate(node.parameters.x, node.parameters.y, node.parameters.z));
    instanceMatrix = mult(instanceMatrix, scale4(node.parameters.xLength, node.parameters.yLength, node.parameters.zLength));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    draw(gl.TRIANGLE_FAN, node.vertices[0], node.normals[0]);
    draw(gl.TRIANGLE_FAN, node.vertices[1], node.normals[1]);
    draw(gl.TRIANGLE_STRIP, node.vertices[2], node.normals[2]);
}

// draws the given node as a sphere
function drawSphere(node) {


    instanceMatrix = mult(modelViewMatrix, rotate(node.parameters['xRotation'], 1, 0, 0));
    instanceMatrix = mult(instanceMatrix, rotate(node.parameters['yRotation'], 0, 1, 0));
    instanceMatrix = mult(instanceMatrix, rotate(node.parameters['zRotation'], 0, 0, 1));

    instanceMatrix = mult(modelViewMatrix, translate(node.parameters.x, node.parameters.y, node.parameters.z));
    instanceMatrix = mult(instanceMatrix, scale4(node.parameters.xLength, node.parameters.yLength, node.parameters.zLength));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    draw(gl.TRIANGLES, node.vertices, node.normals);
}

// draws the surface
function drawSurface(node) {
    instanceMatrix = mult(modelViewMatrix, translate(node.parameters.x, node.parameters.y, node.parameters.z));
    instanceMatrix = mult(instanceMatrix, scale4(node.parameters.xLength, node.parameters.yLength, node.parameters.zLength));

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(instanceMatrix));
    draw(gl.TRIANGLE_FAN, node.vertices, node.normals);
}

// creates a generic sphere and gives the vertices and the normals to the node
function createSphere(node) {
    let latitudeBands = 30;
    let longitudeBands = 30;
    let radius = 1;
    let sphereVertexPosition = [];
    var newShpere = [];
    var newShepereNormals = [];

    // Calculate sphere vertex positions, normals, and texture coordinates.
    for (let latNumber = 0; latNumber <= latitudeBands; ++latNumber) {
        let theta = latNumber * Math.PI / latitudeBands;
        let sinTheta = Math.sin(theta);
        let cosTheta = Math.cos(theta);

        for (let longNumber = 0; longNumber <= longitudeBands; ++longNumber) {
            let phi = longNumber * 2 * Math.PI / longitudeBands;
            let sinPhi = Math.sin(phi);
            let cosPhi = Math.cos(phi);

            let x = cosPhi * sinTheta * radius;
            let y = cosTheta * radius;
            let z = sinPhi * sinTheta * radius;

            sphereVertexPosition.push(vec4(x, y, z, 1.0));
        }
    }

    // Calculate sphere indices.
    for (let latNumber = 0; latNumber < latitudeBands; ++latNumber) {
        for (let longNumber = 0; longNumber < longitudeBands; ++longNumber) {
            let first = (latNumber * (longitudeBands + 1)) + longNumber;
            let second = first + longitudeBands + 1;

            newShpere.push(sphereVertexPosition[first]);
            newShpere.push(sphereVertexPosition[second]);
            newShpere.push(sphereVertexPosition[first + 1]);

            newShpere.push(sphereVertexPosition[second]);
            newShpere.push(sphereVertexPosition[second + 1]);
            newShpere.push(sphereVertexPosition[first + 1]);

            newShepereNormals.push(sphereVertexPosition[first][0], sphereVertexPosition[first][1], sphereVertexPosition[first][2], 0);
            newShepereNormals.push(sphereVertexPosition[second][0], sphereVertexPosition[second][1], sphereVertexPosition[second][2], 0);
            newShepereNormals.push(sphereVertexPosition[first + 1][0], sphereVertexPosition[first + 1][1], sphereVertexPosition[first + 1][2], 0);
            
            newShepereNormals.push(sphereVertexPosition[second][0], sphereVertexPosition[second][1], sphereVertexPosition[second][2], 0);
            newShepereNormals.push(sphereVertexPosition[second + 1][0], sphereVertexPosition[second + 1][1], sphereVertexPosition[second + 1][2], 0);
            newShepereNormals.push(sphereVertexPosition[first + 1][0], sphereVertexPosition[first + 1][1], sphereVertexPosition[first + 1][2], 0);
        }
    }

    node.vertices = newShpere;
    node.normals = newShepereNormals;
    node.rotations = [0,0,0];
}

// creates a generic cylinder and gives the vertices and the normals to the node
function createCylinder(node) {
    node.vertices = [[],[],[]];
    node.normals = [[],[],[]];

    let longitudeBands = 32;
    for (let i = 0; i < longitudeBands; i++) {
        let x = Math.cos(2 * Math.PI / longitudeBands * i);
        let y = Math.sin(2 * Math.PI / longitudeBands * i);
        let z = 0.5;
        node.vertices[0].push(vec4(x / 2, y / 2, z / 2, 1.0));
        node.normals[0].push(x/2, y/2, z/2, 0);
        node.vertices[1].push(vec4(x / 2, y / 2, -z / 2, 1.0));
        node.normals[1].push(x/2, y/2, -z/2, 0);
    }

    for (let i = 0; i < longitudeBands; i++) {
        node.vertices[2].push(node.vertices[0][i]);
        node.normals[2].push(node.vertices[0][i][0], node.vertices[0][i][1], node.vertices[0][i][2], 0);
        node.vertices[2].push(node.vertices[1][i]);
        node.normals[2].push(node.vertices[1][i][0], node.vertices[1][i][1], node.vertices[1][i][2], 0);
    }
    node.vertices[2].push(node.vertices[0][0]);
    node.normals[2].push(node.vertices[0][0][0], node.vertices[0][0][1], node.vertices[0][0][2], 0);
    node.vertices[2].push(node.vertices[1][0]);
    node.normals[2].push(node.vertices[1][0][0], node.vertices[1][0][1], node.vertices[1][0][2], 0);
}

// creates a generic surface and gives the vertices and the normals to the node
function createSurface(node) {
    node.vertices = [];

    var longitudeBands = 32;
    for (let i = 0; i < longitudeBands; i++) {
        let x = Math.cos(2 * Math.PI / longitudeBands * i);
        let y = Math.sin(2 * Math.PI / longitudeBands * i);
        let z = 0.5;
        node.vertices.push(vec4(x/2, y/2, z/2, 1.0));
        node.normals.push(x/2, y/2, z/2, 0);
    }
}

// create animation parameters
var fps = 30;
var time_limit = 75;
var ready = true;
var animationCounter = 0;

// create walk animation for presentation
var default_animString = "leg-6-1 0 -20,leg-6-1 1 20,leg-6-2 1 -40,leg-6-3 0 -25,leg-6-3 1 -20,"+
                 "leg-2-1 0 -20,leg-2-1 1 -20,leg-2-2 1 40,leg-2-3 0 -25,leg-2-3 1 20,"+
                 "leg-4-1 0 -5,leg-4-2 0 -10,leg-4-3 0 -40,leg-4-3 1 -30,"+
                 "leg-8-1 0 -5,leg-8-2 0 -10,leg-8-3 0 -40,leg-8-3 1 30,"+
                 "leg-1-1 0 0,leg-1-2 0 0,leg-1-3 0 0,"+
                 "leg-5-1 0 0,leg-5-2 0 0,leg-5-3 0 0,"+
                 "leg-3-1 0 0,leg-3-2 0 0,leg-3-3 0 0,leg-3-3 1 0,"+
                 "leg-7-1 0 0,leg-7-2 0 0,leg-7-3 0 0,leg-7-3 1 0,"+
                 "lowerTorsoPart 2 -20\n"+
                 "leg-6-1 0 0,leg-6-1 1 0,leg-6-2 1 0,leg-6-3 0 0,leg-6-3 1 0,"+
                 "leg-2-1 0 0,leg-2-1 1 0,leg-2-2 1 0,leg-2-3 0 0,leg-2-3 1 0," + 
                 "leg-4-1 0 0,leg-4-2 0 0,leg-4-3 0 0,leg-4-3 1 0,"+
                 "leg-8-1 0 0,leg-8-2 0 0,leg-8-3 0 0,leg-8-3 1 0,"+
                 "leg-1-1 0 5,leg-1-2 0 -20,leg-1-3 0 40,"+
                 "leg-5-1 0 5,leg-5-2 0 -20,leg-5-3 0 40,"+
                 "leg-3-1 0 40,leg-3-2 0 -10,leg-3-3 0 -40,leg-3-3 1 -20,"+
                 "leg-7-1 0 40,leg-7-2 0 -10,leg-7-3 0 -40,leg-7-3 1 20,"+
                 "lowerTorsoPart 2 20";

// render function for creating animation effect
function renderAnimation(animString) {
    var animFile = animString.split("\n");

    if (ready == true) {

        generateAnimationString(animFile[animationCounter]);

        animationCounter++;

        if (animationCounter > animFile.length - 1) {
            if (document.getElementById("repeat").checked)
                animationCounter = 0;
            if (document.getElementById("walk").checked)
                animationCounter = 0;
        }
    }
}

// convert given string to animation string so that insect's parts can be modified according to given angles and direction
function generateAnimationString(animLine) {

    if (animLine != undefined) {

        ready = false; //block the animation calls
        var fullAnimationCommand = ""; //full animation command that is to be used by the keyframe animator

        var animCommands = animLine.split(","); //split multiple animation requests to process them one by one
        
        for (var j = 0; j < fps; j++) { //divide the animation into fps pieces for smooth and interpolated motion

            for (var i = 0; i < animCommands.length; i++) {

                var command = animCommands[i].split(" ");
                var partName = command[0];
                var moveDirection = parseFloat(command[1]);
                var angle = parseFloat(command[2]);
                if (tree.nodes[partName] != undefined){
                    var total_move = angle - tree.nodes[partName].rotations[moveDirection];
                    var partialMove = (total_move / fps);

                    fullAnimationCommand += partName + " " + moveDirection +  " " + partialMove + ",";
                }

            }

            fullAnimationCommand = fullAnimationCommand.substring(0, fullAnimationCommand.length - 1); //delete the last comma

            fullAnimationCommand += "\n";
        }
        runAnimation(fullAnimationCommand);
    }

}

// according to given animationCommand, it applys given degrees to given parts.
function runAnimation(animationCommand) {

    var j = 0;

    var animationList = animationCommand.split("\n");

    function animate() {
        setTimeout(function () {

            var commands = animationList[j].split(',');

            for (var k = 0; k < commands.length; k++) {

                var command = commands[k].split(" ");

                var executionBodyPart = command[0];
                var executionDirection = parseFloat(command[1]);
                var executionAngle = parseFloat(command[2]);
                if (tree.nodes[executionBodyPart] != undefined)
                    tree.nodes[executionBodyPart].rotations[executionDirection] += executionAngle;
            }

            j++;

            if (j < animationList.length)
                animate();
            else
                ready = true;

        }, 1000 / time_limit)
    }

    animate();
}


var allPostures = "";
var currentPostureString = "";
// creates a current posture string and appends it to allPostures string
function saveCurrentPosture() {
    currentPostureString = "";
    tree.updateCurrentPostureString(tree.root);
    allPostures += currentPostureString + '\n';
}

// cleans allPostures string
function resetSavedPostures(){
    allPostures = "";
}

// stops loaded animation
function stopAnimation(){
    flag = 0;
}

// starts loaded animation
function startAnimation(){
    flag = 1;
}

function resetPosture(){
    flag = 0;
    tree.resetPosture(tree.root);
}

// create a save file which is stores allPostures
function saveAnimationString() {
    var data = [];

    data[0] = allPostures;

    var write_element = document.createElement('a');
    write_element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(data)));
    write_element.setAttribute('download', "SpiderAnimation.txt");

    write_element.style.display = 'none';
    document.body.appendChild(write_element);
    write_element.click();
    document.body.removeChild(write_element);
}

// inits all sliders
function sliderInit() {
    document.getElementById('slider0').oninput = function () {
        tree.nodes['root'].translate[rotation_direction] = parseFloat(document.getElementById("slider0").value) / 180 
        document.getElementById('slider0-value').innerHTML = document.getElementById("slider0").value;
    }
    document.getElementById('slider1').oninput = function () {
        tree.nodes['root'].rotations[0] = parseFloat(document.getElementById("slider1").value)
        document.getElementById('slider1-value').innerHTML = document.getElementById("slider1").value;
    }
    document.getElementById('slider2').oninput = function () {
        tree.nodes['root'].rotations[1] = parseFloat(document.getElementById("slider2").value)
        document.getElementById('slider2-value').innerHTML = document.getElementById("slider2").value;
    }
    document.getElementById('slider3').oninput = function () {
        tree.nodes['root'].rotations[2] = parseFloat(document.getElementById("slider3").value)
        document.getElementById('slider3-value').innerHTML = document.getElementById("slider3").value;
    }   
    document.getElementById('slider4').oninput = function () {
        tree.nodes['leg-4-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider4").value)
        document.getElementById('slider4-value').innerHTML = document.getElementById("slider4").value;
    }
    document.getElementById('slider5').oninput = function () {
        tree.nodes['leg-4-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider5").value)
        document.getElementById('slider5-value').innerHTML = document.getElementById("slider5").value;
    }
    document.getElementById('slider6').oninput = function () {
        tree.nodes['leg-4-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider6").value)
        document.getElementById('slider6-value').innerHTML = document.getElementById("slider6").value;
    }
    document.getElementById('slider7').oninput = function () {
        tree.nodes['leg-8-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider7").value)
        document.getElementById('slider7-value').innerHTML = document.getElementById("slider7").value;
    }
    document.getElementById('slider8').oninput = function () {
        tree.nodes['leg-8-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider8").value)
        document.getElementById('slider8-value').innerHTML = document.getElementById("slider8").value;
    }
    document.getElementById('slider9').oninput = function () {
        tree.nodes['leg-8-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider9").value)
        document.getElementById('slider9-value').innerHTML = document.getElementById("slider9").value;
    }
    document.getElementById('slider10').oninput = function () {
        tree.nodes['leg-1-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider10").value)
        document.getElementById('slider10-value').innerHTML = document.getElementById("slider10").value;
    }
    document.getElementById('slider11').oninput = function () {
        tree.nodes['leg-1-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider11").value)
        document.getElementById('slider11-value').innerHTML = document.getElementById("slider11").value;
    }
    document.getElementById('slider12').oninput = function () {
        tree.nodes['leg-1-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider12").value)
        document.getElementById('slider12-value').innerHTML = document.getElementById("slider12").value;
    }
    document.getElementById('slider13').oninput = function () {
        tree.nodes['leg-5-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider13").value)
        document.getElementById('slider13-value').innerHTML = document.getElementById("slider13").value;
    }
    document.getElementById('slider14').oninput = function () {
        tree.nodes['leg-5-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider14").value)
        document.getElementById('slider14-value').innerHTML = document.getElementById("slider14").value;
    }
    document.getElementById('slider15').oninput = function () {
        tree.nodes['leg-5-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider15").value)
        document.getElementById('slider15-value').innerHTML = document.getElementById("slider15").value;
    } 
    document.getElementById('slider16').oninput = function () {
        tree.nodes['leg-3-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider16").value)
        document.getElementById('slider16-value').innerHTML = document.getElementById("slider16").value;
    }
    document.getElementById('slider17').oninput = function () {
        tree.nodes['leg-3-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider17").value)
        document.getElementById('slider17-value').innerHTML = document.getElementById("slider17").value;
    }
    document.getElementById('slider18').oninput = function () {
        tree.nodes['leg-3-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider18").value)
        document.getElementById('slider18-value').innerHTML = document.getElementById("slider18").value;
    } 
    document.getElementById('slider19').oninput = function () {
        tree.nodes['leg-7-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider19").value)
        document.getElementById('slider19-value').innerHTML = document.getElementById("slider19").value;
    }
    document.getElementById('slider20').oninput = function () {
        tree.nodes['leg-7-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider20").value)
        document.getElementById('slider20-value').innerHTML = document.getElementById("slider20").value;
    }
    document.getElementById('slider21').oninput = function () {
        tree.nodes['leg-7-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider21").value)
        document.getElementById('slider21-value').innerHTML = document.getElementById("slider21").value;
    } 
    document.getElementById('slider22').oninput = function () {
        tree.nodes['leg-2-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider22").value)
        document.getElementById('slider22-value').innerHTML = document.getElementById("slider22").value;
    }
    document.getElementById('slider23').oninput = function () {
        tree.nodes['leg-2-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider23").value)
        document.getElementById('slider23-value').innerHTML = document.getElementById("slider23").value;
    }
    document.getElementById('slider24').oninput = function () {
        tree.nodes['leg-2-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider24").value)
        document.getElementById('slider24-value').innerHTML = document.getElementById("slider24").value;
    } 
    document.getElementById('slider25').oninput = function () {
        tree.nodes['leg-6-1'].rotations[rotation_direction] = parseFloat(document.getElementById("slider25").value)
        document.getElementById('slider25-value').innerHTML = document.getElementById("slider25").value;
    }
    document.getElementById('slider26').oninput = function () {
        tree.nodes['leg-6-2'].rotations[rotation_direction] = parseFloat(document.getElementById("slider26").value)
        document.getElementById('slider26-value').innerHTML = document.getElementById("slider26").value;
    }

    document.getElementById('slider27').oninput = function () {
        tree.nodes['leg-6-3'].rotations[rotation_direction] = parseFloat(document.getElementById("slider27").value)
        document.getElementById('slider27-value').innerHTML = document.getElementById("slider27").value;
    } 

    document.getElementById('slider28').oninput = function () {
        torsoRotation = (rotation_direction+2) % 3;
        tree.nodes['lowerTorsoPart'].rotations[torsoRotation] = parseFloat(document.getElementById("slider28").value)
        document.getElementById('slider28-value').innerHTML = document.getElementById("slider28").value
    } 

    document.getElementById('slider29').oninput = function () {
        connectorRotation = rotation_direction == 0 ? 1 : (rotation_direction == 1 ? 0 : rotation_direction);
        tree.nodes['connectorPart'].rotations[connectorRotation] = parseFloat(document.getElementById("slider29").value)
        document.getElementById('slider29-value').innerHTML = document.getElementById("slider29").value
    } 
}

function scale4(a, b, c) {
   var result = mat4();
   result[0][0] = a;
   result[1][1] = b;
   result[2][2] = c;
   return result;
}

function onDirectionChange(value) {
    rotation_direction = value;
}
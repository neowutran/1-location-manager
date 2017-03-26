const Slash = require('slash');
const jsonfile = require('jsonfile');

function locMan(dispatch){
    const slash = new Slash(dispatch);
    let configFile = './node_modules/1-location-manager/config.json';
    let locations = {};
    let zone;
    let myLocation;

    this.getLocation = function(name){
        return locations[name];
    }
    this.teleport = function(name){
        let _name = name.toLowerCase();
        if(locations[_name] === undefined) return slash.print(`[loc] location "${name}" does not exist`)
        dispatch.toServer('C_REQUEST_TELEPORT',900, locations[_name]);
        slash.print(`[loc] teleporting to ${name}`)
    }
    function parseMapLink(str){
        let regex = /@([0-9]+?)@(.+?),(.+?),(.+?)"/g;
        let results = regex.exec(str);
        if(!results) return false;
        dispatch.toServer('C_REQUEST_TELEPORT', 900, {
            zone: parseInt(results[1]),
            x: parseFloat(results[2]),
            y: parseFloat(results[3]),
            z: 4000
        })
        return true;
    }
    function add(obj, name){
        try{
            let _obj = {
                x: obj.x1,
                y: obj.y1,
                z: obj.z1,
                zone
            }
            locations[name] = _obj;
        } catch (e) {
            console.error(e);
        }
    }
    function remove(name){
        delete locations[name];
    }
    function save(){
        jsonfile.writeFile(configFile, locations);
    }
    function load(){
        jsonfile.readFile(configFile, function(e, obj){
            if(e) return console.error(e);
            locations = obj;
        })
    }

    dispatch.hook('C_PLAYER_LOCATION',1, event => {
        myLocation = event;
    });
    dispatch.hook('S_LOAD_TOPO',1, event => {
        ({zone} = event);
    });

    slash.on('addloc', (args) => {
        if(args[1] === undefined) return;
        let name = args[1].toLowerCase();
        if(locations[name] !== undefined && args[2] !== '1'){
            slash.print(`[loc] "${name}" location is already defined -- add 1 as 2nd argument to overwrite\n(e.g. addloc ${name} 1)`);
            return;
        }
        add(myLocation, name);
        save();
        slash.print(`[loc] "${name}" location added`)
    })
    slash.on('delloc', (args) => {
        if(args[1] === undefined) return;
        let name = args[1].toLowerCase();
        if(locations[name] === undefined) return slash.print(`[loc] location "${args[1]}" does not exist`)
        remove(name);
        save();
        slash.print(`[loc] "${name}" location removed`)
    });
    slash.on('loc', (args, raw) => {
        if(args[1] === undefined) return;
        if(parseMapLink(raw)) return;
        this.teleport(args[1]);
    })

    load();
}

let instance = false;
module.exports = function LocationManager(dispatch){
    if(!dispatch) return instance;
    instance = new locMan(dispatch);
}

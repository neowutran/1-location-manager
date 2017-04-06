const Slash = require('slash');
const jsonfile = require('jsonfile');
const configFile = './node_modules/1-location-manager/config.json';

module.exports = function LocationManager(dispatch){
    const slash = new Slash(dispatch);
    let locations = {}
    let zone
    let myLocation
    let cid

    let block = false
    let allowOne = false

    function teleport(name){
        let _name = name.toLowerCase();
        if(locations[_name] === undefined) return slash.print(`[loc] location "${name}" does not exist`)
        dispatch.toServer('C_REQUEST_TELEPORT',900, locations[_name]);
        slash.print(`[loc] teleporting to ${name}`)
    }
    function move(name){
        let _name = name.toLowerCase();
        if(locations[_name] === undefined) return slash.print(`[loc] location "${name}" does not exist`)
        let location = locations[_name]
        dispatch.toClient('S_INSTANT_MOVE', 1, {
            id: cid, 
            x: location.x,
            y: location.y,
            z: location.z,
            w: 0
        })
        allowOne = true
        setTimeout(() => {
            allowOne = false
            block = false
        }, 2000)
        slash.print(`[loc1] moving to ${name}`)
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
        jsonfile.writeFile(configFile, locations, {spaces: 2}, (err) => {
            if(err) console.log(err)
        });
    }
    function load(){
        jsonfile.readFile(configFile, function(e, obj){
            if(e) return console.error(e);
            locations = obj;
        })
    }

    dispatch.hook('S_LOAD_TOPO',1, event => {
        ({zone} = event);
    });
    dispatch.hook('S_LOGIN',1, event => {
        ({cid} = event)
    })
    dispatch.hook('C_PLAYER_LOCATION', 1, {order: -100, type: 'all'}, event => {
        if(block) return false
        if(allowOne) block = true
        myLocation = event;
    })

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
        teleport(args[1]);
    })
    slash.on('loc1', (args, raw) => {
        if(args[1] === undefined) return
        move(args[1])
    })

    load();
}

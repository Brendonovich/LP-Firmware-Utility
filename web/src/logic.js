import WebMidi from "webmidi"
import { lpModels, lpPorts, errorCodes } from "./constants"
import { saveAs } from 'file-saver'
import axios from "axios";

var outputPort = null

async function downloadCFW() {
  var response = await axios.get("https://api.github.com/repos/mat1jaczyyy/lpp-performance-cfw/contents/build/cfw.syx");

  return new Uint8Array(atob(response.data.content).split('').map(c => c.charCodeAt(0)));;
}

var wasmPatch = Module.cwrap("patch_firmware", null, ["number", "array"])

async function patchFirmware(args) {
  try {
    if (args.selectedLp.includes("CFW")) return await downloadCFW();

    wasmPatch(
      lpModels.indexOf(args.selectedLp),
      Object.values(args.options)
    );

    console.log(FS.readFile("firmware/output.syx"))

  } catch (e) {
    console.log("Firmware deploy failed with status code " + e.status + " " + e.message)
    return null
  }

  return FS.readFile("firmware/output.syx")
}

export default {
  initializeMidi: callback => {
    WebMidi.enable(err => {
      if(err){ 
        return errorCodes.MIDI_UNSUPPORTED
      } else {
        WebMidi.addListener("connected", callback)
        WebMidi.addListener("disconnected", callback)
      }
    }, true)
  },
  updateDevices: () => {
    WebMidi.outputs.forEach(output => {
      var didFindPort = false;
      Object.keys(lpPorts).forEach(portName => {
        if(output.name.includes(portName)){
          didFindPort = true;
          
          if(didFindPort && !!outputPort){
            return errorCodes.MULTIPLE_DEVICES
          }
          else outputPort = output
        }
      })
      
      if(outputPort === null) return errorCodes.NO_DEVICE
      else return null;
    })
  },
  typeChanged: type => {
    if(!outputPort) return errorCodes.NO_DEVICE;
    
    const keys = Object.keys(lpPorts);
		for(var i = 0; i < keys.length; i++)
	    if(outputPort.name.includes(keys[i]) && lpPorts[keys[i]] === type) 
	      return
		
		return errorCodes.SELECTION_NOT_FOUND
  },
  flashFirmware: async args => {
    var fw = await patchFirmware(args)
    
    if (fw === null) return;

    var messages = []
    var currentMessage = []
    
    fw.forEach(byte => {
      if(byte === 0xF0){}
      else if(byte === 0xF7){
        messages.push(currentMessage)
        currentMessage = []
      } else currentMessage.push(byte)
    })
    
    messages.forEach(message => {
      outputPort.sendSysex([], message);
    })
  },
  downloadFirmware: async args => {
    var fw = await patchFirmware(args)
    
    if (fw === null) return;
    
    saveAs(new Blob([fw.buffer]), "output.syx");
  }
}
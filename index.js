// NOTE: reproducing an issue where exiting a program after using node-usb v1.7.0 is significantly delayed.
// https://github.com/joelpurra/node-usb-issue-418-delay-at-exit
//
// The code is essentially a boiled-downed version of uvcc, where the issue was first reported.
// https://github.com/joelpurra/uvcc

const usb = require('usb');
const {
  promisify
} = require('util');

// References headings in, and uses constants from, the the UVC specification.
// "UVC 1.5 Class specification.pdf"
// https://www.usb.org/documents?search=uvc

// See: Appendix A. Video Device Class Codes
// See: A.1. Video Interface Class Code
const CC_VIDEO = 0x0E;
// See: A.2. Video Interface Subclass Codes
const SC_VIDEOCONTROL = 0x01;

// See: A.4. Video Class-Specific Descriptor Types
const CS_INTERFACE = 0x24;
// See: A.5. Video Class-Specific VC Interface Descriptor Subtypes
const VC_PROCESSING_UNIT = 0x05;

// See: 4.1.2 Get Request
const BM_REQUEST_TYPE_CLASS_DEVICE_GET = usb.LIBUSB_REQUEST_TYPE_CLASS | usb.LIBUSB_RECIPIENT_DEVICE | usb.LIBUSB_ENDPOINT_IN;
const B_REQUEST_GET_CUR = 0x81;

// See: 4.2.2.3.12 White Balance Temperature Control
const PU_WHITE_BALANCE_TEMPERATURE_CONTROL = 0x0A;
const PU_WHITE_BALANCE_TEMPERATURE_CONTROL_W_LENGTH = 2;
const PU_WHITE_BALANCE_TEMPERATURE_CONTROL_W_INDEX = 0;

const main = async () => {
  const devices = usb.getDeviceList();

  // NOTE: simple, incomplete UVC device detection to find the first available camera.
  const firstUVCDevice = devices.find(
    // See: 3.2 Device Descriptor
    // > Devices that expose one or more Video Interface Collections also indicate that class information
    // > is to be found at the interface level. However, since the device uses an Interface Association
    // > Descriptor in order to describe the Video Interface Collection, it must set the bDeviceClass,
    // > bDeviceSubClass and bDeviceProtocol fields 0xEF, 0x02 and 0x01 respectively. This set of
    // > class codes is defined as the Multi-interface Function Class codes.
    (device) =>
      device.deviceDescriptor.bDeviceClass === 0xef &&
          device.deviceDescriptor.bDeviceSubClass === 0x02 &&
          device.deviceDescriptor.bDeviceProtocol === 0x01
  );

  firstUVCDevice.open();

  console.log({
    idVendor: firstUVCDevice.deviceDescriptor.idVendor,
    idProduct: firstUVCDevice.deviceDescriptor.idProduct,
    deviceAddress: firstUVCDevice.deviceAddress,
    iProduct: JSON.stringify(await promisify(firstUVCDevice.getStringDescriptor)
      .call(
        firstUVCDevice,
        firstUVCDevice.deviceDescriptor.iProduct
      ))
  });

  const firstVideoControlInterfaceIndex = firstUVCDevice.interfaces.findIndex(
    (iface) =>
      iface.descriptor.bInterfaceClass === CC_VIDEO &&
     iface.descriptor.bInterfaceSubClass === SC_VIDEOCONTROL
  );
  const firstVideoControlInterfaceDescriptorExtras = [];

  (() => {
    // Immediately Invoked Function Expression (IIFE) to scope some variables.
    const firstVideoControlInterface = firstUVCDevice.interfaces[firstVideoControlInterfaceIndex];
    const {
      extra
    } = firstVideoControlInterface.descriptor;

    for (let offset = 0; offset < extra.length;) {
      // NOTE: keeping the size byte in the buffer to be able to the same descriptor byte offsets as the specification.
      const size = extra[offset];
      const end = offset + size;

      if (end > extra.length) {
        throw new RangeError(`Trying to read outside of buffer: ${end}.`);
      }

      const values = extra.subarray(offset, end);
      firstVideoControlInterfaceDescriptorExtras.push(values);
      offset = end;
    }
  })();

  const firstProcessingUnitDescriptor = firstVideoControlInterfaceDescriptorExtras.find(
    (descriptor) =>
      descriptor[1] === CS_INTERFACE &&
       descriptor[2] === VC_PROCESSING_UNIT
  );
  const firstProcessingUnitDescriptorBUnitID = firstProcessingUnitDescriptor[3];

  // NOTE: selected the white balance temperature because it changes depending on the lighting conditions, which
  // can be easily affected (turn on/off ceiling lights, cover the lens, etcetera) while the camera is active.
  const whiteBalanceTemperatureControlTransferResult = await promisify(firstUVCDevice.controlTransfer)
    .call(
      firstUVCDevice,
      BM_REQUEST_TYPE_CLASS_DEVICE_GET,
      B_REQUEST_GET_CUR,
      (PU_WHITE_BALANCE_TEMPERATURE_CONTROL << 8) | 0x00,
      (firstProcessingUnitDescriptorBUnitID << 8) | firstVideoControlInterfaceIndex,
      PU_WHITE_BALANCE_TEMPERATURE_CONTROL_W_LENGTH
    );
  const whiteBalanceTemperature = whiteBalanceTemperatureControlTransferResult.readIntLE(
    PU_WHITE_BALANCE_TEMPERATURE_CONTROL_W_INDEX,
    PU_WHITE_BALANCE_TEMPERATURE_CONTROL_W_LENGTH
  );

  console.log({
    whiteBalanceTemperature
  });

  firstUVCDevice.close();
};

main();

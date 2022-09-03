'use babel';

import SwitchNoteMessageDialog from './switch-note-message-dialog';

module.exports = {
  config: {
    switchWithReturnKey: {
      title: "Switch note with return key",
      type: "boolean",
      default: false,
    },
  },

  activate() {
    inkdrop.components.registerClass(SwitchNoteMessageDialog);
    inkdrop.layouts.addComponentToLayout(
      'modal',
      'SwitchNoteMessageDialog'
    )
  },

  deactivate() {
    inkdrop.layouts.removeComponentFromLayout(
      'modal',
      'SwitchNoteMessageDialog'
    )
    inkdrop.components.deleteClass(SwitchNoteMessageDialog);
  }

};

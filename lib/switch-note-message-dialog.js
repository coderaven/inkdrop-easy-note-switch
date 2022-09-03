'use babel';

import React, { useEffect, useCallback } from 'react'
import { CompositeDisposable } from 'event-kit';
import { Dropdown } from 'semantic-ui-react';

export default function SwitchNoteMessageDialog(props) {
  const dialogRef = React.useRef();
  console.log('dialogRef', dialogRef);

  const [options, setOptions] = React.useState([]);
  const [selectedBookId, setSelectedBookId] = React.useState('');

  useEffect(() => {
    inkdrop.onAppReady(() => {
      const { books } = inkdrop.store.getState();
      const options = books.all.map(({ _id, name }) => ({
        key: _id,
        value: _id,
        text: name,
      }));
      setOptions(options);
    });
  }, []);

  useEffect(() => {
    const subscriptions = new CompositeDisposable();

    subscriptions.add(
      inkdrop.commands.add(document.body, {
        'switch-note:toggle': () => toggle(),
      })
    );

    return () => {
      subscriptions.dispose();
    };
  }, []);

  const switchNote = (bookId) => {
    console.log('bookId', bookId);
    inkdrop.commands.dispatch(document.body, 'core:note-list-show-notes-in-book', {
      bookId: bookId,
    });
    inkdrop.commands.dispatch(document.body, 'core:focus-note-list-bar');
    dialogRef.current.dismissDialog();
  };

  const handleSwitch = useCallback((event, data) => {
    const switchWithReturnKey = inkdrop.config.get('switch-note.switchWithReturnKey');

    if (switchWithReturnKey) {
      console.log('switchWithReturnKey', true);
      setSelectedBookId(data.value);
    } else {
      console.log('switchWithReturnKey', false);
      switchNote(data.value);
    }
  }, []);

  const handleKeyUp = (event) => {
    const switchWithReturnKey = inkdrop.config.get('switch-note.switchWithReturnKey');

    if (switchWithReturnKey && event.keyCode === 13) {
      switchNote(selectedBookId);
    }
  };

  const toggle = useCallback(() => {
    if (!dialogRef.current.isShown) {
      dialogRef.current.showDialog();
    } else {
      dialogRef.current.dismissDialog();
    }
  }, []);

  const { MessageDialog } = inkdrop.components.classes;

  return (
    <MessageDialog
      ref={dialogRef}
      title="Switch Note"
      buttons={[]}
      modalSettings={{ autofocus: true }}
    >
      <Dropdown
        onKeyUp={handleKeyUp}
        options={options}
        placeholder="Select note"
        onChange={handleSwitch}
        searchInput={<Dropdown.SearchInput className="ui input" />}
        fluid
        selection
        search
      />
    </MessageDialog>
  );
}
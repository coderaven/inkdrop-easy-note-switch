'use babel';

import React from 'react';
import { CompositeDisposable } from 'event-kit';
import { Dropdown } from 'semantic-ui-react';

export default class SwitchNoteMessageDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = { options: [], noteId: '', bookId: '', dictionaryHash: 0 };
  }

  buildDictionary() {
    const db = inkdrop.main.dataStore.getLocalDB();
    const notebookPaths = this.buildNotebookPaths(inkdrop.store.getState().books.all);
    const dictionaryHash = this.dictionaryHash(inkdrop.store.getState());

    // If this hash hasn't changed, there's little point rebuilding the internal dictionary.
    // Aim is to provide a slight optimisation for people with a large number of notes!
    if (dictionaryHash === this.state.dictionaryHash) {
      return;
    }

    db.notes.all({limit:1000}).then(notes => {
      const options = notes.docs.map(({ _id, title, bookId }) => ({
        key: _id,
        value: {note: _id, book: bookId},
        text: title === '' ? '[Untitled Note]' : title,
        description: this.pathToString(notebookPaths[bookId]),
        path: notebookPaths[bookId],
      }));

      this.setState({ 
        options, 
        dictionaryHash 
      });
    });
  }

  dictionaryHash(state) {
    const {books, db, notes, config} = state;

    // Ok, so not really a hash, but same principle.
    return [
      books.lastUpdatedAt,
      notes.timestamp,
      db.lastSyncTime,
      config.updatedAt
    ].join('-');
  }

  buildNotebookPaths(notebooks) {
    const lookup = {};
    const tree = {};

    // Build a quick lookup to make finding book details easier.
    notebooks.forEach(notebook => {
      lookup[notebook._id] = notebook;
    });

    Object.keys(lookup).map(key => {
      let book = lookup[key];

      // The book for which this note is directly conained in
      let path = [ book.name ];

      // Build a reverse path of each parent book until we reach the root
      while (book.parentBookId) {
        const oldBook = book;
        book = lookup[book.parentBookId];

        if (book === undefined) {
          console.log({book, oldBook, lookup, notebooks});
        }
        
        path.push(book.name);
      }

      tree[key] = path;
    });

    return tree;
  }

  pathToString(path) {
    if (path.length > 3) {
      // Truncate long ptahs with a ... in the middle
      path = [ path[0], path[1], '...', path[path.length - 1] ];
    }

    return path.slice().reverse().join(' > ');
  }

  componentWillMount () {
    // Events subscribed to in Inkdrop's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this dialog
    this.subscriptions.add(inkdrop.commands.add(document.body, {
      'switch-note:open': () => this.open()
    }));
  }

  componentWillUnmount () {
    this.subscriptions.dispose();
  }

  searchNotes = (options, query) => {
    // Lowercase the query to make searching easier.
    query = query.toLowerCase();

    return options.filter(option => {
      // Lowercase the note title and each notebook in the path to make searching easier.
      const text = option.text.toLowerCase();
      const path = option.path.map(notebook => notebook.toLowerCase());

      return query.split(' ').reduce((queryCarry, querySegment) => {
        // Check if the note title contains this segment of the query at all
        const noteTitleContainsQuerySegment = text.indexOf(querySegment) > -1;

        // Check if any path segment (notebook name) contains this query segment.
        const pathSegmentContainsQuerySegment = path.reduce((pathCarry, pathSegment) => {
          // This should return true if any path segment matches the query segment. 
          return pathCarry || pathSegment.indexOf(querySegment) > -1;
        }, false);

        // This should only return true if every query segment can be matched against the note title and notebook path.
        return queryCarry && (noteTitleContainsQuerySegment || pathSegmentContainsQuerySegment);
      }, true);
    });
  };

  switchNote = (event, data) => {
    if (this.state.bookId !== data.value.book) {
      inkdrop.commands.dispatch(document.body, 'core:note-list-show-notes-in-book', {bookId: data.value.book});
    }

    setTimeout(() => {
      inkdrop.commands.dispatch(document.body, 'core:open-note', { noteId: data.value.note, selectInNoteListBar: true });
      inkdrop.commands.dispatch(document.body, 'editor:focus')
    }, 100);

    this.setState({
      noteId: data.value.note,
      bookId: data.value.book,
    });

    this.refs.dialog.dismissDialog();
  };

  open() {
    const { dialog } = this.refs;
    if (!dialog.isShown) {
      // attempt to rebuild the dictionary each time the dialog is opened.
      this.buildDictionary();
      dialog.showDialog();
    } else {
      dialog.dismissDialog();
    }
  }

  render() {
    const { MessageDialog } = inkdrop.components.classes;

    return (
      <MessageDialog
        ref='dialog'
        title='Open Note'
        buttons={[]}
        modalSettings={{ autofocus: true }}
        onDismiss={() => { inkdrop.commands.dispatch(document.body, 'editor:focus') }}
      >
        <Dropdown
          options={this.state.options}
          placeholder='Select Note'
          onChange={this.switchNote}
          search={this.searchNotes}
          searchInput={<Dropdown.SearchInput className='ui input' />}
          selectOnNavigation={false}
          fluid
          selection
          // search
        />
      </MessageDialog>
    );
  }
}
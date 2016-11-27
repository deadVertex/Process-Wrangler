import {ipcRenderer} from 'electron'
import React from 'react'
import ReactDOM from 'react-dom'

import injectTapEventPlugin from 'react-tap-event-plugin'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import RaisedButton from 'material-ui/RaisedButton'
import {Table, TableBody, TableHeader, TableHeaderColumn, TableRow, TableRowColumn} from 'material-ui/Table';

injectTapEventPlugin();

class ProcessTableEntry extends React.Component {
  constructor(props) {
    super(props);
  }

  shouldComponentUpdate(nextProps, nextState) {
    const {pid, name, threadCount, workingSetSize, selected, rowNumber, ...otherProps} = this.props;

    if (pid !== nextProps.pid) {
      return true;
    }
    if (name !== nextProps.name) {
      return true;
    }
    if (threadCount !== nextProps.threadCount) {
      return true;
    }
    if (workingSetSize !== nextProps.workingSetSize) {
      return true;
    }

    if (selected !== nextProps.selected) {
      return true;
    }

    if (rowNumber !== nextProps.rowNumber) {
      return true;
    }

    return false;
  }

  render() {
    const {pid, name, threadCount, workingSetSize, selected, ...otherProps} = this.props;
    return (
        <TableRow {...otherProps} >
          {otherProps.children[0]}
          <TableRowColumn>{pid}</TableRowColumn>
          <TableRowColumn>{name}</TableRowColumn>
          <TableRowColumn>{threadCount}</TableRowColumn>
          <TableRowColumn>{(workingSetSize / ( 1024 * 1024)).toFixed(2)} MB</TableRowColumn>
        </TableRow>
    )
  }
}

class ProcessTable extends React.Component {
  constructor(props) {
    super(props);

    this.processes = [];
    this.state = {
      selectedProcesses : []
    }
  }

  componentDidMount() {
  }

  componentWillUnmount() {
  }

  componentWillReceiveProps(nextProps) {
    var sortedProcesses = nextProps.processes.sort(function(a, b) {
      if (a.workingSetSize < b.workingSetSize) {
        return -1;
      } else if (a.workingSetSize > b.workingSetSize) {
        return 1;
      }
      return 0;
    });

    this.processes = sortedProcesses;
  }

  shouldComponentUpdate(nextProps, nextState) {
    return true;
  }

  isProcessSelected(pid) {
    return this.state.selectedProcesses.some(selectedPid => {
      return pid === selectedPid;
    });
  }

  onRowSelection(selectedRows) {
    if (selectedRows === 'all') {
      var allProcesses = this.processes.map(function(entry, index) {
        return entry.pid;
      });
      this.setState({selectedProcesses: allProcesses});
    } else if (selectedRows === 'none') {
      this.setState({selectedProcesses: []});
    } else {
      var selectedProcesses = [];
      selectedRows.forEach(selectedRow => {
        console.log(selectedRow);
        selectedProcesses.push(this.processes[selectedRow].pid);
      });
      this.setState({selectedProcesses : selectedProcesses});
    }
  }

  onEndProcesses() {
  }

  render() {
    var rows = this.processes.map(function(entry, index) {
      return (
        <ProcessTableEntry key={entry.pid} pid={entry.pid} name={entry.name} threadCount={entry.numThreads} workingSetSize={entry.workingSetSize} rowNumber={index} selected={this.isProcessSelected(entry.pid)} />
      );
    }, this);

    return (
    <div>
      <Table multiSelectable={true} height={this.props.height} onRowSelection={this.onRowSelection.bind(this)} ref={(table) => {this.table = table;}}>
        <TableHeader displaySelectAll={false}>
          <TableRow>
            <TableHeaderColumn>PID</TableHeaderColumn>
            <TableHeaderColumn>Name</TableHeaderColumn>
            <TableHeaderColumn>Threads</TableHeaderColumn>
            <TableHeaderColumn>Working Set</TableHeaderColumn>
          </TableRow>
        </TableHeader>
        <TableBody deselectOnClickaway={false} children={rows} ref={(tableBody) => {this.tableBody = tableBody;}} />
      </Table>
      <RaisedButton label="End Process" primary={true} onClick={this.onEndProcesses.bind(this)} />
    </div>
    )
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { processes: [] };
  }

  componentDidMount() {
    ipcRenderer.on('processList_update', (event, result) => this.updateProcessList(result));
  }

  updateProcessList(processList) {
    this.setState({processes: processList});
  }

  render() {
    return (
      <MuiThemeProvider>
        <div>
          <ProcessTable height='300px' processes={this.state.processes} />
        </div>
      </MuiThemeProvider>
    )
  }
}

ReactDOM.render(<App />, document.getElementById('root'));

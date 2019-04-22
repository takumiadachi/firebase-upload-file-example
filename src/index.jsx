import React from "react";
import ReactDOM from "react-dom";
import * as OfflinePluginRuntime from "offline-plugin/runtime";
import "./css/index.scss";
import firebase from "./fb";

window.addEventListener("load", () => {
  console.log("Event: Load");

  function updateNetworkStatus() {
    if (navigator.onLine) {
      document.getElementById("status").innerHTML = "Online!";
    } else {
      document.getElementById("status").innerHTML = "Offline";
    }
  }

  setTimeout(() => {
    updateNetworkStatus();
  }, 500);

  window.addEventListener("offline", () => {
    console.log("Event: Offline");
    document.getElementById("status").innerHTML = "Offline";
  });

  window.addEventListener("online", () => {
    console.log("Event: Online");
    document.getElementById("status").innerHTML = "Online!";
  });
});

OfflinePluginRuntime.install({
  onInstalled: () => {
    console.log("SW Event: onInstalled");
  },

  onUpdating: () => {
    console.log("SW Event: onUpdating");
  },

  onUpdateReady: () => {
    console.log("SW Event: onUpdateReady");
    // Tells to new SW to take control immediately
    OfflinePluginRuntime.applyUpdate();
  },

  onUpdated: () => {
    console.log("SW Event: onUpdated");
  }
});

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      uploaded: false,
      fileInput: "",
      progress: 0,
      bytesTransferred: 0,
      size: 0,
      status: "Ready", //paused or running
      errorCode: null
    };

    this.storageRef;
    this.imagesRef;
    this.fileInputRef = React.createRef(); // Ref to <input type="file" />
    this.file;
    this.fileData;
    this.fileName;
    this.fileSize;
    this.fileMetaData;
    this.lastModifiedDate;
    this.reader = new FileReader();
  }

  setUploaded(bool) {
    this.setState({
      uploaded: bool
    });
  }

  onFileChange = event => {
    let files = event.target.files;
    this.reader.onload = r => {
      this.fileData = r.target.result;
      console.log(typeof this.fileData);
    };
    try {
      if (files[0]) {
        this.reader.readAsDataURL(files[0]);
        this.file = files[0];
        this.fileName = files[0].name;
        this.fileSize = files[0].size;
        this.fileType = { contentType: files[0].type };
        console.log(this.file);
        console.log(this.fileName, this.fileSize, this.fileType);
        this.setState({
          size: files[0].size
        });
      } else {
        throw error;
      }
    } catch (error) {
      console.log(error);
    }
  };

  clear() {
    this.fileInputRef.current.value = ""; // Clears <input type="file" />
    this.setState({
      uploaded: false,
      fileInput: "",
      progress: 0,
      bytesTransferred: 0,
      size: 0,
      status: "Ready", //paused or running
      errorCode: null
    });
  }

  onFileSubmit = event => {
    // Stops page from refreshing.
    event.preventDefault();

    let uploadTask = this.storageRef
      .child(`images/${this.fileName}`)
      .put(this.file, this.fileType);

    // Listen for state changes, errors, and completion of the upload.
    uploadTask.on(
      firebase.storage.TaskEvent.STATE_CHANGED, // or 'state_changed'
      snapshot => {
        // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
        let progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.setState({
          progress: progress
        });
        console.log(firebase.storage.TaskState);
        console.log(snapshot);
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            this.setState({
              status: "Paused",
              bytesTransferred: snapshot.bytesTransferred
            });
            console.log("Upload is paused.");
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            this.setState({
              status: "Running",
              bytesTransferred: snapshot.bytesTransferred
            });
            console.log("Upload is running.");
            break;
          case firebase.storage.TaskState.SUCCESS: // or 'running'
            this.setState({
              status: "Upload Success!",
              bytesTransferred: snapshot.bytesTransferred
            });
            console.log("Upload Success!");
            break;
          case firebase.storage.TaskState.CANCELED: // or 'running'
            this.setState({
              status: "Upload cancelled.",
              bytesTransferred: snapshot.bytesTransferred
            });
            console.log("Upload is cancelled.");
            break;
          case firebase.storage.TaskState.ERROR: // or 'running'
            this.setState({
              status: "Upload Error.",
              bytesTransferred: snapshot.bytesTransferred
            });
            console.log("Upload error.");
            break;
        }
      },
      error => {
        // A full list of error codes is available at
        // https://firebase.google.com/docs/storage/web/handle-errors
        switch (error.code) {
          case "storage/unauthorized":
            // User doesn't have permission to access the object
            break;

          case "storage/canceled":
            // User canceled the upload
            break;
          case "storage/unknown":
            // Unknown error occurred, inspect error.serverResponse
            break;
        }
      },
      () => {
        // Upload completed successfully, now we can get the download URL
        uploadTask.snapshot.ref.getDownloadURL().then(
          function(downloadURL) {
            console.log(this);
            console.log("File available at", downloadURL);
            this.setState({
              status: "Upload Success!"
            });
            console.log("Upload Success!");
          }.bind(this)
        );
      }
    );
  };

  componentDidMount() {
    console.log("Component mounted!");
    this.storageRef = firebase.storage().ref();
    this.imagesRef = this.storageRef.child("images"); //points to images
  }

  render() {
    return (
      <div>
        <form onSubmit={this.onFileSubmit.bind(this)}>
          <h3>Upload File Here</h3>
          <div>
            <input
              type="file"
              accept="image/*"
              ref={this.fileInputRef}
              onChange={e => this.onFileChange(e)}
            />
          </div>
          <div>
            <input type="submit" value="Submit" />
          </div>
          <div>
            <button type="button" onClick={this.clear.bind(this)}>
              Clear
            </button>
          </div>
          <progress value={this.state.progress} max="100" />
          <div>{this.state.status}</div>
          <div>
            {this.state.bytesTransferred > 0
              ? `${this.state.bytesTransferred} uploaded`
              : null}
          </div>
          <div>{this.state.size > 0 ? `${this.state.size} bytes` : null}</div>
          <div>{this.state.errorCode}</div>
        </form>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));

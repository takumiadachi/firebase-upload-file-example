import React from "react";
import ReactDOM from "react-dom";
import * as OfflinePluginRuntime from "offline-plugin/runtime";
import "./css/index.scss";
import firebase from "./fb";
import fileType from "file-type";
import filesize from "filesize";

const ONLINE = `<div style="color:green">PWA Online!</div>`;
const OFFLINE = `<div style="color:GoldenRod">PWA Offline</div>`;

window.addEventListener("load", () => {
  console.log("Event: Load");

  function updateNetworkStatus() {
    if (navigator.onLine) {
      document.getElementById("status").innerHTML = ONLINE;
    } else {
      document.getElementById("status").innerHTML = OFFLINE;
    }
  }

  setTimeout(() => {
    updateNetworkStatus();
  }, 500);

  window.addEventListener("online", () => {
    console.log("Event: Online");
    document.getElementById("status").innerHTML = ONLINE;
  });
  window.addEventListener("offline", () => {
    console.log("Event: Offline");
    document.getElementById("status").innerHTML = OFFLINE;
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

const MAX_FILESIZE = Number(process.env.MAX_FILESIZE);

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      uploaded: false,
      fileInput: "",
      progress: 0,
      bytesTransferred: 0,
      size: 0,
      status: "Ready", // Paused, running, ready, etc
      downloadURL: "",
      errorCode: ""
    };

    this.storageRef;
    this.database;
    this.imagesRef;
    this.fileInputRef = React.createRef(); // Ref to <input type="file" />
    this.file;
    this.fileData;
    this.fileName = "";
    this.fileSize = 0;
    this.fileMime = "";
    this.ext = "";
    this.lastModifiedDate;
    this.reader = new FileReader();
  }

  componentDidMount() {
    console.log("App Component Mounted!");
    //Initialize firebase stuff after component is mounted.
    this.storageRef = firebase.storage().ref();
    this.database = firebase.firestore();
    this.imagesRef = this.storageRef.child("images"); //points to /images on firebase
    this.database
      .collection("uploadRefs")
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          console.log(doc);
        });
      });
  }

  onFileChange = event => {
    let files = event.target.files;

    // Check if file is not greater than max filesize.
    if (files[0].size >= MAX_FILESIZE) {
      alert(`[${files[0].name}] too big! Max: ${filesize(MAX_FILESIZE)}`);
      this.fileInputRef.current.value = "";
      return;
    }

    try {
      if (files[0]) {
        this.reader.readAsArrayBuffer(files[0]); // Can trigger onload event.
        this.file = files[0];
        this.fileName = files[0].name;
        this.fileSize = files[0].size;
        this.fileType = { contentType: files[0].type };
        this.setState({
          size: files[0].size
        });
        // when content read with readAsArrayBuffer, readAsBinaryString, readAsDataURL or readAsText is available. Can trigger FileReader.onload.
        this.reader.onload = event => {
          this.fileData = event.target.result;
          let mimeSignature = fileType(new Uint8Array(e.target.result));
          this.fileMime = mimeSignature.mime;
          this.ext = mimeSignature.ext;
          // Check if file is the correct mimeType
          if (
            !(this.fileMime === "image/jpeg" || this.fileMime === "image/png")
          ) {
            alert(`File must be jpeg or png.`);
            this.fileInputRef.current.value = ""; // Clears <input type="file" />
            return;
          }
        };
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
      downloadURL: "",
      errorCode: null
    });
  }

  onFileSubmit = event => {
    // Stops page from refreshing.
    event.preventDefault();

    /**
     * This code is taken liberally from the official docs:
     * https://firebase.google.com/docs/storage/web/upload-files
     */
    // Upload Task.
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
        // Firebase States.
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
            console.error("Do not have permission to access the object.");

            break;
          case "storage/canceled":
            // User canceled the upload
            console.error("Upload was cancelled.");
            break;
          case "storage/unknown":
            // Unknown error occurred, inspect error.serverResponse
            console.error("An unknown error occured.");
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
              downloadURL: downloadURL
            });
            this.setState({
              status: "Upload Success!"
            });
            console.log("Upload Success!");

            // Add to database to display uploaded files to see.
            this.database
              .collection("uploadRefs")
              .add({
                fileName: this.fileName,
                url: downloadURL,
                type: this.fileType,
                size: this.fileSize
              })
              .then(docRef => {
                console.log("Document written with ID: ", docRef.id);
              })
              .catch(error => {
                console.error("Error adding document: ", error);
              });
          }.bind(this)
        );
      }
    );
  };

  render() {
    return (
      <div>
        <form onSubmit={this.onFileSubmit.bind(this)}>
          <div style={{ fontSize: "24px" }}>Upload File Here</div>
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
            <span style={{ fontSize: "12px" }}>{`<${filesize(
              MAX_FILESIZE
            )}`}</span>
          </div>
          <div>
            <button type="button" onClick={this.clear.bind(this)}>
              Clear
            </button>
          </div>
          <div>
            <progress value={this.state.progress} max="100" />
            <span style={{ fontSize: "12px" }}>{`${
              this.state.progress
            }%`}</span>
          </div>
          <div>
            <span style={{ fontSize: "15px" }}>{this.state.status}</span>
          </div>
          <div>
            {this.state.bytesTransferred > 0
              ? `${this.state.bytesTransferred} /`
              : null}{" "}
            {this.state.size > 0 ? `${this.state.size} bytes` : null}
          </div>
          <div>
            <span style={{ fontSize: "12px" }}>{this.state.errorCode}</span>
          </div>
          <div>
            {this.state.downloadURL !== "" ? `${this.state.downloadURL}` : null}
          </div>
        </form>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));

export default App;

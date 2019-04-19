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

    this.storageRef;
    this.imagesRef;
    this.file;
    this.fileData;
    this.fileName;
    this.fileSize;
    this.fileMetaData;
    this.lastModifiedDate;
    this.reader = new FileReader();
  }

  onFileChange = e => {
    let files = e.target.files;
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
      } else {
        throw error;
      }
    } catch (error) {
      console.log(error);
    }
  };

  onFileSubmit = e => {
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
        var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log("Upload is " + progress + "% done");
        switch (snapshot.state) {
          case firebase.storage.TaskState.PAUSED: // or 'paused'
            console.log("Upload is paused");
            break;
          case firebase.storage.TaskState.RUNNING: // or 'running'
            console.log("Upload is running");
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
        uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
          console.log("File available at", downloadURL);
        });
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
        <form onSubmit={this.onFileSubmit}>
          <h3>Upload File Here</h3>

          <div>
            <input
              type="file"
              accept="image/*"
              onChange={e => this.onFileChange(e)}
            />
          </div>
          <div>
            <input type="submit" value="Submit" />
          </div>
        </form>
      </div>
    );
  }
}

ReactDOM.render(<App />, document.getElementById("app"));

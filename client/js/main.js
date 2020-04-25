const initButton = document.getElementById('init');
const connectButton = document.getElementById('connect');
const stopButton = document.getElementById('stop');
initButton.disabled = false;
connectButton.disabled = true;
stopButton.disabled = true;

let gotLocalMedia = false;
let websocketConnected = false;

//指video标签
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
//指媒体本身
let localMedia;
const userMediaConstraint = {
    'video': true,
    'autio': false,
};

const iceServers = [{urls: 'stun:stun1.xxx.com'}];
const offerOptions = {
    offerToReceiveVideo: 1,
    offerToReceiveAudio: 1,
};

let signalWebSocket;
let peerConnection;

function onInitButtonClick() {
    initButton.disabled = true;
    initWebSocket();
    navigator.mediaDevices.getUserMedia(userMediaConstraint)
        .then((localMedia) => {
            localVideo.srcObject = localMedia;
            gotLocalMedia = true;
            if (gotLocalMedia && websocketConnected) {
                connectButton.disabled = false;
            }
        })
        .catch((error) => {
            console.error('获取本地媒体设备失败:', error);
        });

}

function onConnectButtonClick() {
    connectButton.disabled = true;
    stopButton.disabled = false;
    const localVideoTracks = localMedia.getVideoTracks();
    const localAudioTracks = localMedia.getAudioTracks();
    if (localVideoTracks.length == 0) {
        console.error('获取到本地视频源数量为0');
    }
    if (localAudioTracks.length == 0) {
        console.error('获取到本地音频源数量为0');
    }
    peerConnection = new RTCPeerConnection({iceServers:iceServers});
    //本地浏览器触发
    peerConnection.icecandidate = onIceCandidate;
    peerConnection.iceconnectionstatechange = onIceConnectionStateChange;
    //收到对端的流媒体
    peerConnection.onaddstream = onRemoteMedia;

    const sdp = peerConnection.createOffer(offerOptions)
        .then((sdp) => {
            peerConnection.setLocalDescription(sdp)
                .then(() => {
                    signalWebSocket.send(JSON.stringify({type:'sdp', sdp:sdp}));
                })
                .catch((error) => {
                    console.log('设置本地sdp失败:', error);
                });
        })
        .catch((error) => {
            console.log('创建offer失败:', error);
        });
}

function onIceCandidate(event) {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
        signalWebSocket.send(JSON.stringify({type:'icecandidate', icecandidate:iceCandidate}));
    }
}

function onIceConnectionStateChange(event) {
    console.log('onIceConnectionStateChange:', event);
}

function initWebSocket() {
    signalWebSocket = new WebSocket('ws://signaling.server.com');
    signalWebSocket.onopen = function() {
        websocketConnected = true;
        if (websocketConnected && gotLocalMedia) {
            connectButton.disabled = false;
        }
    };

    signalWebSocket.onmessage = function(event) {
        const msg = event.data;
        if (typeof msg === String) {
            dispatchSignalMessage(msg);
        } else {
            console.error('websocket不支持该消息类型:', msg);
        }
    };

    signalWebSocket.onclose = function() {
        console.log('websocket closed');
    };

    signalWebSocket.onerror = function(event) {
        console.error('websocekt error:', event);
    }
}

function onRemoteMedia(event) {
    console.log('收到对端流媒体');
    remoteVideo.srcObject = event.stream;
}

function dispatchSignalMessage(msg) {
    let obj = JSON.parse(msg);
    switch (obj['type']) {
        case 'sdp':
            let sdp = obj['sdp'];
            console.log('收到对端sdp:', sdp);
            try {
                peerConnection.setRemoteDescription(sdp);
            } catch (error) {
                console.log('添加对端sdp失败:', error);
            }
            break;
        case 'icecandidate':
            let icecandidate = obj['icecandidate'];
            console.log('收到对端icecandidate:', icecandidate);
            try {
                peerConnection.addIceCandidate(icecandidate);
            console.log('添加对端icecandidate成功');
            } catch (error) {
                console.log('添加对端icecandidate失败:', error);
            }
            break;
        default:
            break;
    }
}
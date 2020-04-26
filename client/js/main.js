const initButton = document.getElementById('init');
const connectButton = document.getElementById('connect');
const stopButton = document.getElementById('stop');
initButton.disabled = false;
connectButton.disabled = true;
stopButton.disabled = true;
initButton.onclick = onInitButtonClick;
connectButton.onclick = onConnectButtonClick;


let gotLocalMedia = true;
let websocketConnected = false;

//指video标签
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
//指媒体本身
let localMedia;
const userMediaConstraint = {
    video: true,
};

const iceServers = [{urls: 'stun:stun.server.com:3478'}];
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
        .then((lm) => {
            console.log('已获得本地媒体设备');
            localVideo.srcObject = lm;
            localMedia = lm;
            gotLocalMedia = true;
            if (gotLocalMedia && websocketConnected) {
                connectButton.disabled = false;
            }
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
            peerConnection.onicecandidate = onIceCandidate;
            peerConnection.oniceconnectionstatechange = onIceConnectionStateChange;
            //收到对端的流媒体
            //peerConnection.onaddstream = onRemoteMedia;
            peerConnection.ontrack = onRemoteMedia;
            for (let i=0; i<localVideoTracks.length; i++) {
                console.log('addTrack:', localVideoTracks[i]);
                peerConnection.addTrack(localVideoTracks[i]);
            }
        })
        .catch((error) => {
            console.error('获取本地媒体设备失败:', error);
        });

}

function onConnectButtonClick() {
    connectButton.disabled = true;
    stopButton.disabled = false;
    const sdp = peerConnection.createOffer(offerOptions)
        .then((sdp) => {
            console.log('创建本地spd:', sdp);
            peerConnection.setLocalDescription(sdp)
                .then(() => {
                    console.log('设置本地sdp成功，准备通过websocket发送至对端');
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
    console.log('获得本地icecandidate', event);
    const iceCandidate = event.candidate;
    if (iceCandidate) {
        console.log('准备通过websocket发送本地icecandidate');
        signalWebSocket.send(JSON.stringify({type:'icecandidate', icecandidate:iceCandidate}));
    }
}

function onIceConnectionStateChange(event) {
    console.log('onIceConnectionStateChange:', event);
}

function initWebSocket() {
    signalWebSocket = new WebSocket('ws://127.0.0.1:9877/signaling');
    signalWebSocket.onopen = function() {
        console.log('已连接至信令服务器');
        websocketConnected = true;
        if (websocketConnected && gotLocalMedia) {
            connectButton.disabled = false;
        }
    };

    signalWebSocket.onmessage = function(event) {
        const msg = event.data;
        //console.log('收到来自信令服务器的消息:', event);
        //if (typeof msg === String) {
            dispatchSignalMessage(msg);
        //} else {
        //    console.error('websocket不支持该消息类型:', msg);
        //}
    };

    signalWebSocket.onclose = function() {
        console.log('与信令服务器断开连接');
    };

    signalWebSocket.onerror = function(event) {
        console.error('与信令服务器的连接发生错误:', event);
    }
}

let inboundStream;
function onRemoteMedia(event) {
    console.log('收到对端流媒体',event);
    if (event.streams && event.streams[0]) {
        remoteVideo.srcObject = ev.streams[0];
    } else {
        if (!inboundStream) {
            inboundStream = new MediaStream();
            remoteVideo.srcObject = inboundStream;
        }
        inboundStream.addTrack(event.track);
    }
}

function dispatchSignalMessage(msg) {
    let obj = JSON.parse(msg);
    switch (obj['type']) {
        case 'sdp':
            let sdp = obj['sdp'];
            console.log('收到对端sdp:', sdp);
            connectButton.disabled = true;
            peerConnection.setRemoteDescription(sdp)
            .then(() => {
                console.log('添加对端sdp成功');
            })
            .catch((error) => {
                console.error('设置对端sdp失败:', error);
            });

            peerConnection.createAnswer()
            .then((answer) => {
                peerConnection.setLocalDescription(answer)
                .then(() => {
                    console.log('设置本地sdp成功');
                })
                .catch((error) => {
                    console.error('设置本地sdp失败:', error);
                })
                signalWebSocket.send(JSON.stringify({type:'answer', answer:answer}));
            })
            .catch((error) => {
                console.log('创建sdp answer失败:', error);
            });

            break;
        case 'icecandidate':
            let icecandidate = obj['icecandidate'];
            console.log('收到对端icecandidate:', icecandidate);
            peerConnection.addIceCandidate(icecandidate)
            .then(() => {
                console.log('添加对端icecandidate成功');
            })
            .catch((error) => {
                console.error('添加对端icecandidate失败',error);
            })

            break;
        case 'answer':
            let answer = obj['answer'];
            console.log('收到对端sdp answer:', answer)
            peerConnection.setRemoteDescription(answer)
            .then(() => {
                console.log('添加对端sdp成功');
            })
            .catch((error) => {
                console.error('添加对端sdp失败:', error);
            });
        default:
            break;
    }
}
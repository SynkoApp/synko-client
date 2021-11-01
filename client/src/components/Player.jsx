import React from 'react';
import UrlParser from 'js-video-url-parser';
import Player from 'react-player';
import { FaPlay } from 'react-icons/fa';

export default class Message extends React.Component {
    constructor(props){
        super(props)
        this.state = {
            url: null,
            isFirst: false,
            config: {
                youtube: {
                    playerVars: {
                        start: 0,
                        modestbranding: 1,
                        rel: 0                 
                    }
                }
            }
        }
    }

    componentDidMount() {
        this.initVideo();
    }

    initVideo() {
        if(!this.state.url) {
            let params = this.props.video.params || 'internal';
            let url = UrlParser.create({
                videoInfo: this.props.video,
                format: "long",
                params
            });
            this.setState({
                url,
                config: {
                    youtube: {
                        playerVars: {
                            ...this.state.config.youtube.playerVars,
                            start: params.start || 0 
                        }
                    }
                }
            });            
        }

    }

    getThumbnail() {
        return UrlParser.create({
            videoInfo: this.props.video,
            format: "longImage",
            params: {
                imageQuality: "mqdefault"
            }
        });
    }

    render (){
        this.initVideo();
        return (
            <div className={'w-max rounded bg-gray-750'}>
                {!this.state.isFirst ? <div className={'relative rounded'} style={{ width: "640px", height: "360px", background: `url(${this.getThumbnail()}) no-repeat center center`, backgroundSize: "cover" }}>
                    <div className={'rounded flex justify-center items-center bg-black w-full h-full bg-opacity-40'}>
                        <span onClick={() => { this.setState({ isFirst: true }) }} className={'bg-blue-500 cursor-pointer hover:bg-opacity-100 flex items-center bg-opacity-80 h-24 w-24 rounded-full'}>
                            <FaPlay className={'text-gray-300 text-5xl m-auto mr-5'}/>                             
                        </span>
                    </div>
                </div> : <Player playing controls url={this.state.url} config={this.state.config} />}
            </div>
        )
    }
}
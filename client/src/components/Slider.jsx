import React from "react";
import $ from "jquery";

export default class Slider extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            indexSlide: 1
        }
    }

    currentSlide(n) {
        this.setState({
            indexSlide: n+1
        });
    }

    render(){
        return(
            <>
                <span className={'uppercase w-full text-left text-gray-400 text-xxs font-semibold'}>{this.props.images[this.state.indexSlide-1]?.file.name} - {(this.props.images[this.state.indexSlide-1]?.file.size / (1024*1024)).toFixed(2)}MB</span>
                <img draggable={false} className={"rounded block w-full"} src={this.props.images[this.state.indexSlide-1]?.src} />
                {this.props.images.length > 1 ?
                    <>
                        <span className={"block text-center mt-2 text-gray-400"}>{this.state.indexSlide}/{this.props.images.length}</span>
                        <div className={'mt-2 text-center'}>
                            {this.props.images.map(img => 
                                <span key={Math.floor(Date.now() * Math.random())} onClick={() => { this.currentSlide(this.props.images.indexOf(img)) }} className={'slide-dot cursor-pointer h-4 w-4 mx-2 rounded-full inline-block ' + (this.state.indexSlide-1 == this.props.images.indexOf(img) ? "bg-gray-200" : "bg-gray-600")}></span>    
                            )}
                        </div>
                    </>
                : ""}

            </>
        )
    }
}
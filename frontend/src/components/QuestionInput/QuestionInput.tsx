import { useState } from "react";
import { Stack, TextField } from "@fluentui/react";
import { SendRegular } from "@fluentui/react-icons";
import Send from "../../assets/Send.svg";
import styles from "./QuestionInput.module.css";
import ArrowUpIcon from '../../assets/i-arrow-up.svg?react';

interface Props {
    onSend: (question: string, id?: string) => void;
    disabled: boolean;
    placeholder?: string;
    clearOnSend?: boolean;
    conversationId?: string;
}

export const QuestionInput = ({ onSend, disabled, placeholder, clearOnSend, conversationId }: Props) => {
    const [question, setQuestion] = useState<string>("");

    const sendQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (disabled || !question.trim()) {
            return;
        }

        if (conversationId) {
            onSend(question, conversationId);
        } else {
            onSend(question);
        }

        if (clearOnSend) {
            setQuestion("");
        }
    };

    const onEnterPress = (ev: React.KeyboardEvent<Element>) => {
        if (ev.key === "Enter" && !ev.shiftKey && !(ev.nativeEvent?.isComposing === true)) {
            ev.preventDefault();
            // sendQuestion();
        }
    };

    const onQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuestion(e.target.value || "");
    };

    const sendQuestionDisabled = disabled || !question.trim();

    return (
        <div className="flex flex-col gap-1 pb-2 px-8 lg:px-36 w-full max-w-[720px] lg:max-w-[1024px] justify-self-center">
            <form
                className="flex font-default bg-chat-dark dark:bg-chat-dark-inverse rounded-full items-center justify-between justify-self-center p-1 pl-2 gap-3 min-w-full"
                onSubmit={sendQuestion}
            >
                <input
                    type="text"
                    placeholder="Message Dear Mayor"
                    className="w-full bg-inherit p-1 font-default font-light outline-none placeholder:text-secondary-inverse-txt text-chat-default"
                    value={question}
                    style={{marginLeft: "7px"}}
                    onChange={onQuestionChange}
                />

                <button
                    type="submit"
                    disabled={sendQuestionDisabled}
                    className="p-2 rounded-full bg-secondary-txt enabled:bg-interactive-enabled enabled:fill-chat-dark disabled:fill-interactive-disabled disabled:bg-secondary-txt"
                >
                    <ArrowUpIcon />
                </button>
            </form>
            <p className="text-center text-sm text-secondary-txt">
                Dear Mayor can make mistakes. Check important info.
            </p>
        </div>
        // <Stack horizontal className={styles.questionInputContainer}>
        //     <TextField
        //         className={styles.questionInputTextArea}
        //         placeholder={placeholder}
        //         multiline
        //         resizable={false}
        //         borderless
        //         value={question}
        //         onChange={onQuestionChange}
        //         onKeyDown={onEnterPress}
        //     />
        //     <div className={styles.questionInputSendButtonContainer} 
        //         role="button" 
        //         tabIndex={0}
        //         aria-label="Ask question button"
        //         onClick={sendQuestion}
        //         onKeyDown={e => e.key === "Enter" || e.key === " " ? sendQuestion() : null}
        //     >
        //         { sendQuestionDisabled ? 
        //             <SendRegular className={styles.questionInputSendButtonDisabled}/>
        //             :
        //             <img src={Send} className={styles.questionInputSendButton}/>
        //         }
        //     </div>
        //     <div className={styles.questionInputBottomBorder} />
        // </Stack>
    );
};

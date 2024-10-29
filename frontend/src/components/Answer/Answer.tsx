import { FormEvent, useEffect, useMemo, useState, useContext } from "react";
import { useBoolean } from "@fluentui/react-hooks"
import { Checkbox, DefaultButton, Dialog, FontIcon, Stack, Text } from "@fluentui/react";
import DOMPurify from 'dompurify';
import { AppStateContext } from '../../state/AppProvider';

import styles from "./Answer.module.css";

import { AskResponse, Citation, Feedback, historyMessageFeedback } from "../../api";
import { parseAnswer } from "./AnswerParser";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import supersub from 'remark-supersub'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ThumbDislike20Filled, ThumbLike20Filled } from "@fluentui/react-icons";
import { XSSAllowTags, XSSAllowAttributes } from "../../constants/xssAllowTags";
import { BsFolderSymlink } from "react-icons/bs";
import LaunchChatAva from '../../assets/launch-chat-avatar.svg?react';
import CaretDown from '../../assets/i-caret-down.svg?react';
import IconButton from "../IconButton/IconButton";
import ThumbsDown from '../../assets/i-thumbs-down.svg?react';
import ThumbUp from '../../assets/i-thumbs-up.svg?react';
import rehypeRaw from "rehype-raw";
import { ReactTyped } from "react-typed";

interface Props {
    answer: AskResponse;
    onCitationClicked: (citedDocument: Citation) => void;
    isLoading: boolean | undefined;
}

export const Answer = ({
    answer,
    onCitationClicked,
    isLoading
}: Props) => {
    const initializeAnswerFeedback = (answer: AskResponse) => {
        if (answer.message_id == undefined) return undefined;
        if (answer.feedback == undefined) return undefined;
        if (answer.feedback.split(",").length > 1) return Feedback.Negative;
        if (Object.values(Feedback).includes(answer.feedback)) return answer.feedback;
        return Feedback.Neutral;
    }

    const [isRefAccordionOpen, { toggle: toggleIsRefAccordionOpen }] = useBoolean(false);
    const filePathTruncationLimit = 50;

    const parsedAnswer = useMemo(() => parseAnswer(answer), [answer]);
    const [chevronIsExpanded, setChevronIsExpanded] = useState(isRefAccordionOpen);
    const [feedbackState, setFeedbackState] = useState(initializeAnswerFeedback(answer));
    const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
    const [showReportInappropriateFeedback, setShowReportInappropriateFeedback] = useState(false);
    const [negativeFeedbackList, setNegativeFeedbackList] = useState<Feedback[]>([]);
    const appStateContext = useContext(AppStateContext)
    const FEEDBACK_ENABLED = appStateContext?.state.frontendSettings?.feedback_enabled && appStateContext?.state.isCosmosDBAvailable?.cosmosDB;
    const SANITIZE_ANSWER = appStateContext?.state.frontendSettings?.sanitize_answer
    const [isAnswerTypingComplete, setIsAnswerTypingComplete] = useState(false);


    const handleChevronClick = () => {
        setChevronIsExpanded(!chevronIsExpanded);
        toggleIsRefAccordionOpen();
    };

    useEffect(() => {
        setChevronIsExpanded(isRefAccordionOpen);
    }, [isRefAccordionOpen]);

    useEffect(() => {
        if (answer.message_id == undefined) return;

        let currentFeedbackState;
        if (appStateContext?.state.feedbackState && appStateContext?.state.feedbackState[answer.message_id]) {
            currentFeedbackState = appStateContext?.state.feedbackState[answer.message_id];
        } else {
            currentFeedbackState = initializeAnswerFeedback(answer);
        }
        setFeedbackState(currentFeedbackState)
    }, [appStateContext?.state.feedbackState, feedbackState, answer.message_id]);

    const createCitationFilepath = (citation: Citation, index: number, truncate: boolean = false) => {
        let citationFilename = "";

        if (citation.filepath) {
            const part_i = citation.part_index ?? (citation.chunk_id ? parseInt(citation.chunk_id) + 1 : '');
            if (truncate && citation.filepath.length > filePathTruncationLimit) {
                const citationLength = citation.filepath.length;
                citationFilename = `${citation.filepath.substring(0, 20)}...${citation.filepath.substring(citationLength - 20)} - Part ${part_i}`;
            }
            else {
                citationFilename = `${citation.filepath} - Part ${part_i}`;
            }
        }
        else if (citation.filepath && citation.reindex_id) {
            citationFilename = `${citation.filepath} - Part ${citation.reindex_id}`;
        }
        else {
            citationFilename = `Citation ${index}`;
        }
        return citationFilename;
    }

    const onFolderClicked = (data: Citation) => {
        const dataUrl = data.url;
        const fileUrl = dataUrl?.replace(" ", "%20");
        window.open(fileUrl, '_blank');
    }

    const onLikeResponseClicked = async () => {
        if (answer.message_id == undefined) return;

        let newFeedbackState = feedbackState;
        // Set or unset the thumbs up state
        if (feedbackState == Feedback.Positive) {
            newFeedbackState = Feedback.Neutral;
        }
        else {
            newFeedbackState = Feedback.Positive;
        }
        appStateContext?.dispatch({ type: 'SET_FEEDBACK_STATE', payload: { answerId: answer.message_id, feedback: newFeedbackState } });
        setFeedbackState(newFeedbackState);

        // Update message feedback in db
        await historyMessageFeedback(answer.message_id, newFeedbackState);
    }

    const onDislikeResponseClicked = async () => {
        if (answer.message_id == undefined) return;

        let newFeedbackState = feedbackState;
        if (feedbackState === undefined || feedbackState === Feedback.Neutral || feedbackState === Feedback.Positive) {
            newFeedbackState = Feedback.Negative;
            setFeedbackState(newFeedbackState);
            setIsFeedbackDialogOpen(true);
        } else {
            // Reset negative feedback to neutral
            newFeedbackState = Feedback.Neutral;
            setFeedbackState(newFeedbackState);
            await historyMessageFeedback(answer.message_id, Feedback.Neutral);
        }
        appStateContext?.dispatch({ type: 'SET_FEEDBACK_STATE', payload: { answerId: answer.message_id, feedback: newFeedbackState } });
    }

    const updateFeedbackList = (ev?: FormEvent<HTMLElement | HTMLInputElement>, checked?: boolean) => {
        if (answer.message_id == undefined) return;
        let selectedFeedback = (ev?.target as HTMLInputElement)?.id as Feedback;

        let feedbackList = negativeFeedbackList.slice();
        if (checked) {
            feedbackList.push(selectedFeedback);
        } else {
            feedbackList = feedbackList.filter((f) => f !== selectedFeedback);
        }

        setNegativeFeedbackList(feedbackList);
    };

    const onSubmitNegativeFeedback = async () => {
        if (answer.message_id == undefined) return;
        await historyMessageFeedback(answer.message_id, negativeFeedbackList.join(","));
        resetFeedbackDialog();
    }

    const resetFeedbackDialog = () => {
        setIsFeedbackDialogOpen(false);
        setShowReportInappropriateFeedback(false);
        setNegativeFeedbackList([]);
    }

    const UnhelpfulFeedbackContent = () => {
        return (<>
            <div>Why wasn't this response helpful?</div>
            <Stack tokens={{ childrenGap: 4 }}>
                <Checkbox label="Citations are missing" id={Feedback.MissingCitation} defaultChecked={negativeFeedbackList.includes(Feedback.MissingCitation)} onChange={updateFeedbackList}></Checkbox>
                <Checkbox label="Citations are wrong" id={Feedback.WrongCitation} defaultChecked={negativeFeedbackList.includes(Feedback.WrongCitation)} onChange={updateFeedbackList}></Checkbox>
                <Checkbox label="The response is not from my data" id={Feedback.OutOfScope} defaultChecked={negativeFeedbackList.includes(Feedback.OutOfScope)} onChange={updateFeedbackList}></Checkbox>
                <Checkbox label="Inaccurate or irrelevant" id={Feedback.InaccurateOrIrrelevant} defaultChecked={negativeFeedbackList.includes(Feedback.InaccurateOrIrrelevant)} onChange={updateFeedbackList}></Checkbox>
                <Checkbox label="Other" id={Feedback.OtherUnhelpful} defaultChecked={negativeFeedbackList.includes(Feedback.OtherUnhelpful)} onChange={updateFeedbackList}></Checkbox>
            </Stack>
            <div onClick={() => setShowReportInappropriateFeedback(true)} style={{ color: "#115EA3", cursor: "pointer" }}>Report inappropriate content</div>
        </>);
    }

    const ReportInappropriateFeedbackContent = () => {
        return (
            <>
                <div>The content is <span style={{ color: "red" }} >*</span></div>
                <Stack tokens={{ childrenGap: 4 }}>
                    <Checkbox label="Hate speech, stereotyping, demeaning" id={Feedback.HateSpeech} defaultChecked={negativeFeedbackList.includes(Feedback.HateSpeech)} onChange={updateFeedbackList}></Checkbox>
                    <Checkbox label="Violent: glorification of violence, self-harm" id={Feedback.Violent} defaultChecked={negativeFeedbackList.includes(Feedback.Violent)} onChange={updateFeedbackList}></Checkbox>
                    <Checkbox label="Sexual: explicit content, grooming" id={Feedback.Sexual} defaultChecked={negativeFeedbackList.includes(Feedback.Sexual)} onChange={updateFeedbackList}></Checkbox>
                    <Checkbox label="Manipulative: devious, emotional, pushy, bullying" defaultChecked={negativeFeedbackList.includes(Feedback.Manipulative)} id={Feedback.Manipulative} onChange={updateFeedbackList}></Checkbox>
                    <Checkbox label="Other" id={Feedback.OtherHarmful} defaultChecked={negativeFeedbackList.includes(Feedback.OtherHarmful)} onChange={updateFeedbackList}></Checkbox>
                </Stack>
            </>
        );
    }

    const components = {
        code({ node, ...props }: { node: any, [key: string]: any }) {
            let language;
            if (props.className) {
                const match = props.className.match(/language-(\w+)/);
                language = match ? match[1] : undefined;
            }
            const codeString = node.children[0].value ?? '';
            return (
                <SyntaxHighlighter style={nord} language={language} PreTag="div" {...props}>
                    {codeString}
                </SyntaxHighlighter>
            );
        },
    };
    return (
        <>
            <div className="flex gap-4 min-w-[292px] max-w-[720px] rounded-3xl bg-transparent p-2 md:py-3 md:px-6">
                <div className="fill-black">
                    <LaunchChatAva />
                </div>
                <div className="flex flex-col gap-2">
                    <div className="content">
                        {!isLoading && !isAnswerTypingComplete && (
                            <ReactTyped
                                strings={[SANITIZE_ANSWER
                                    ? DOMPurify.sanitize(parsedAnswer.markdownFormatText, {
                                        ALLOWED_TAGS: XSSAllowTags,
                                        ALLOWED_ATTR: XSSAllowAttributes,
                                    })
                                    : parsedAnswer.markdownFormatText]}
                                typeSpeed={1}
                                backSpeed={1050}
                                loop={false}
                                showCursor={false}
                                onComplete={() => setIsAnswerTypingComplete(true)}
                            />
                        )}
                        {isAnswerTypingComplete && (
                            <ReactMarkdown
                            remarkPlugins={[remarkGfm, supersub]}
                            className={styles.markdown}
                            children={SANITIZE_ANSWER
                                ? DOMPurify.sanitize(parsedAnswer.markdownFormatText, {
                                    ALLOWED_TAGS: XSSAllowTags,
                                    ALLOWED_ATTR: XSSAllowAttributes,
                                })
                                : parsedAnswer.markdownFormatText}
                          />
                        )}

                    </div>
                    {!!parsedAnswer.citations.length && isAnswerTypingComplete && (
                        <div className={`resources flex flex-col gap-2.5 transition-opacity duration-1000 ${!isLoading ? 'opacity-100 h-auto overflow-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                            <div>
                                {parsedAnswer.citations.length <= 2 ? (
                                    <p className="py-2 px-3 font-bold">
                                        {parsedAnswer.citations.length} resources found
                                    </p>
                                ) : (
                                    <button
                                        className="flex gap-1 bg-interactive-secondary dark:bg-chat-dark-inverse dark:fill-default-txt-dark py-2 px-3 rounded-lg"
                                        onClick={handleChevronClick}
                                    >
                                        <span>{parsedAnswer.citations.length} resources found</span>
                                        <CaretDown />
                                    </button>
                                )}
                            </div>

                            <ul
                                className={`${chevronIsExpanded || parsedAnswer.citations.length <= 2 ? 'h-auto overflow-auto' : 'h-0 overflow-hidden'} flex flex-col gap-0.5 justify-start transition-all`}
                            >
                                {parsedAnswer.citations.map((citation, idx) => (

                                    <li
                                        title={createCitationFilepath(citation, ++idx)}
                                        tabIndex={0}
                                        role="link"
                                        key={idx}
                                        className="group-hover:text-interactive-primary"
                                        aria-label={createCitationFilepath(citation, idx)}
                                    >
                                        <div className="d-flex"
                                            onClick={() => onCitationClicked(citation)}
                                            onKeyDown={e => e.key === "Enter" || e.key === " " ? onCitationClicked(citation) : null}>
                                            <span className={styles.citation}>{idx}</span>
                                            <span className={styles.citationLink}>{createCitationFilepath(citation, idx, true)}</span>
                                            <span title="Click to open share point" className={styles.fileUrl} onClick={() => onFolderClicked(citation)} ><BsFolderSymlink /></span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {FEEDBACK_ENABLED && answer.message_id !== undefined &&
                        <div className="flex gap-3">
                            <IconButton
                                icon={<ThumbUp />}
                                tooltip={{ content: 'Like', place: 'bottom' }}
                                isActive={feedbackState === Feedback.Positive || appStateContext?.state.feedbackState[answer.message_id] === Feedback.Positive}
                                onClick={() => onLikeResponseClicked()}
                            />
                            <IconButton
                                icon={<ThumbsDown />}
                                tooltip={{ content: 'Dislike', place: 'bottom' }}
                                isActive={(feedbackState !== Feedback.Positive && feedbackState !== Feedback.Neutral && feedbackState !== undefined)}
                                onClick={() => onDislikeResponseClicked()}
                            />
                        </div>
                    }
                </div>
            </div>
            {/* <Stack className={styles.answerContainer} tabIndex={0}>

                <Stack.Item>
                    <Stack horizontal grow>
                        <Stack.Item grow>
                            <ReactMarkdown
                                linkTarget="_blank"
                                remarkPlugins={[remarkGfm, supersub]}
                                children={SANITIZE_ANSWER ? DOMPurify.sanitize(parsedAnswer.markdownFormatText, { ALLOWED_TAGS: XSSAllowTags }) : parsedAnswer.markdownFormatText}
                                className={styles.answerText}
                                components={components}
                            />
                        </Stack.Item>
                        <Stack.Item className={styles.answerHeader}>
                            {FEEDBACK_ENABLED && answer.message_id !== undefined && <Stack horizontal horizontalAlign="space-between">
                                <ThumbLike20Filled
                                    aria-hidden="false"
                                    aria-label="Like this response"
                                    onClick={() => onLikeResponseClicked()}
                                    style={feedbackState === Feedback.Positive || appStateContext?.state.feedbackState[answer.message_id] === Feedback.Positive ?
                                        { color: "darkgreen", cursor: "pointer" } :
                                        { color: "slategray", cursor: "pointer" }}
                                />
                                <ThumbDislike20Filled
                                    aria-hidden="false"
                                    aria-label="Dislike this response"
                                    onClick={() => onDislikeResponseClicked()}
                                    style={(feedbackState !== Feedback.Positive && feedbackState !== Feedback.Neutral && feedbackState !== undefined) ?
                                        { color: "darkred", cursor: "pointer" } :
                                        { color: "slategray", cursor: "pointer" }}
                                />
                            </Stack>}
                        </Stack.Item>
                    </Stack>

                </Stack.Item>
                <Stack horizontal className={styles.answerFooter}>
                    {!!parsedAnswer.citations.length && (
                        <Stack.Item
                            onKeyDown={e => e.key === "Enter" || e.key === " " ? toggleIsRefAccordionOpen() : null}
                        >
                            <Stack style={{ width: "100%" }} >
                                <Stack horizontal horizontalAlign='start' verticalAlign='center'>
                                    <Text
                                        className={styles.accordionTitle}
                                        onClick={toggleIsRefAccordionOpen}
                                        aria-label="Open references"
                                        tabIndex={0}
                                        role="button"
                                    >
                                        <span>{parsedAnswer.citations.length > 1 ? parsedAnswer.citations.length + " references" : "1 reference"}</span>
                                    </Text>
                                    <FontIcon className={styles.accordionIcon}
                                        onClick={handleChevronClick} iconName={chevronIsExpanded ? 'ChevronDown' : 'ChevronRight'}
                                    />
                                </Stack>

                            </Stack>
                        </Stack.Item>
                    )}
                    <Stack.Item className={styles.answerDisclaimerContainer}>
                        <span className={styles.answerDisclaimer}>AI-generated content may be incorrect</span>
                    </Stack.Item>
                </Stack>
                {chevronIsExpanded &&
                    <div className={styles.citationWrapper} >
                        {parsedAnswer.citations.map((citation, idx) => {
                            return (
                                <>
                                    <span
                                        title={createCitationFilepath(citation, ++idx)}
                                        tabIndex={0}
                                        role="link"
                                        key={idx}
                                        className={styles.citationContainer}
                                        aria-label={createCitationFilepath(citation, idx)}
                                    >
                                        <span
                                            onClick={() => onCitationClicked(citation)}
                                            onKeyDown={e => e.key === "Enter" || e.key === " " ? onCitationClicked(citation) : null}>
                                            <div className={styles.citation}>{idx}</div>
                                            {createCitationFilepath(citation, idx, true)}
                                        </span>

                                        <span title="Click to open share point" className={styles.fileUrl} onClick={() => onFolderClicked(citation)} ><BsFolderSymlink /></span>
                                    </span>
                                </>
                            );
                        })}
                    </div>
                }
            </Stack> */}
            <Dialog
                onDismiss={() => {
                    resetFeedbackDialog();
                    setFeedbackState(Feedback.Neutral);
                }}
                hidden={!isFeedbackDialogOpen}
                styles={{

                    main: [{
                        selectors: {
                            ['@media (min-width: 480px)']: {
                                maxWidth: '600px',
                                background: "#FFFFFF",
                                boxShadow: "0px 14px 28.8px rgba(0, 0, 0, 0.24), 0px 0px 8px rgba(0, 0, 0, 0.2)",
                                borderRadius: "8px",
                                maxHeight: '600px',
                                minHeight: '100px',
                            }
                        }
                    }]
                }}
                dialogContentProps={{
                    title: "Submit Feedback",
                    showCloseButton: true
                }}
            >
                <Stack tokens={{ childrenGap: 4 }}>
                    <div>Your feedback will improve this experience.</div>

                    {!showReportInappropriateFeedback ? <UnhelpfulFeedbackContent /> : <ReportInappropriateFeedbackContent />}

                    <div>By pressing submit, your feedback will be visible to the application owner.</div>

                    <DefaultButton disabled={negativeFeedbackList.length < 1} onClick={onSubmitNegativeFeedback}>Submit</DefaultButton>
                </Stack>

            </Dialog>
        </>
    );
};

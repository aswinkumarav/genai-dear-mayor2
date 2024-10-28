import styles from "../styles/homePage.module.scss";
import commonStyles from "../styles/common.module.scss";
import classNames from 'classnames';
import { Link } from 'react-router-dom';
import { Card, Row, Carousel } from "react-bootstrap";
import { AiFillWechat } from "react-icons/ai";
// import "bootstrap/dist/css/bootstrap.min.css";
import { useEffect, useState } from "react";
import Nav from "react-bootstrap/Nav";
import { getUseCaseList, getUserInfo } from "../../api";
import Spinner from "react-bootstrap/Spinner";

function LandingPage() {
    const [selectedNavItem, setSelectedNavItem] = useState<string>("0");
    const [usecaseList, setUsecaseList] = useState<any>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const carouselContainer = classNames("container", styles.carouselContainer);
    const imageOne = classNames(styles.imageOne);
    const imageTwo = classNames(styles.imageTwo);
    const imageThree = classNames(styles.imageThree);
    const bannerText = classNames(styles.customCarouselBannertxt);
    const buttonStyle = classNames(
        "btn btn-secondary",
        styles.customCarouselButton
    );

    function changeSelectedNavItem(selectedkey: any) {
        if (selectedNavItem !== selectedkey) {
          setSelectedNavItem(selectedkey);
        }
      }

    const getCurrentUser = async () => {
        getUserInfo().then((res: any) => {
            if (res && res.length) {
                const userClaims = res[0]['user_claims'];
                const i = userClaims.findIndex((res: any) => res.typ == "preferred_username");
                callUseCaseList(userClaims[i]['val']);
            }
        });
    }

    const callUseCaseList = (userId: string) => {
        setIsLoading(true);
        getUseCaseList(userId).then((response: any) => {
            setIsLoading(false);
            if (!usecaseList.length) {
                setUsecaseList(response);
            }
        })
    }

    const setUsecase = (useCaseName: string) => {
        window.sessionStorage.setItem(
            "useCaseName",
            useCaseName
          );
    }

    useEffect(() => { getCurrentUser(); callUseCaseList("")}, []);

    return (
        <>
            <div className={styles.homePageWrapper}>
                <div className={styles.homePageContainer}>
                    <div className={styles.layoutContent}>
                    </div>
                    <div className={carouselContainer}>
                        <div className="text-white my-4 text-center">
                            <Carousel controls={false} className={styles.carouselItem}>
                                <Carousel.Item className={styles.carouselItem}>
                                    <div className={imageOne}></div>
                                    <Carousel.Caption className={bannerText}>
                                        <h5>Release of toolkits and components</h5>
                                        <p>17 components and 5 toolkits to be released as a part of Q1 facilitating rapid Gen AI deployment.</p>
                                        {/* <button
                                            className={buttonStyle}
                                            onClick={() =>
                                                window.open(
                                                    `${window.location}isPal`
                                                )
                                            }
                                        >
                                            Start here
                                        </button> */}
                                    </Carousel.Caption>
                                </Carousel.Item>
                                <Carousel.Item className={styles.carouselItem}>
                                    <div className={imageTwo}></div>
                                    <Carousel.Caption className={bannerText}>
                                        <h5>Gen AI accomplishments</h5>
                                        <p>Gen AI POCs successfully done for USBank, HYG, Clarios, Balfour and Coca-Cola.</p>
                                        {/* <button
                                            className={buttonStyle}
                                            onClick={() =>
                                                window.open(
                                                    `${window.location}ticket`
                                                )
                                            }
                                        >
                                            Start here
                                        </button> */}
                                    </Carousel.Caption>
                                </Carousel.Item>
                            </Carousel>
                        </div>
                        <div className="" style={{paddingBottom: '10px'}}>
                            <Nav
                                variant="pills"
                                className={commonStyles.customNavPillBar}
                                onSelect={changeSelectedNavItem}    
                            >
                                <Nav.Item className={`${commonStyles.customNav}`}>
                                    {/* <Nav.Link
                                    eventKey={0}
                                    data-id={`nav-0`}
                                    className={`${commonStyles.customNavPill} ${selectedNavItem == '0' ? commonStyles.navActive : ''}`}
                                    >
                                        All
                                    </Nav.Link> */}
                                </Nav.Item>
                            </Nav>
                            <Card className={commonStyles.landingPageCard}>
                                <Card.Body>
                                    <Row>
                                        { isLoading ? (
                                            <Spinner
                                                animation="border"
                                                role="status"
                                                className={commonStyles.pageLoader}
                                            ></Spinner>
                                        ) : (
                                            <>
                                                { selectedNavItem == '0' ?  ( 
                                                <>
                                                    {usecaseList && usecaseList.map((usecase: any) => (
                                                        <div className="col-md-4 mb-3">
                                                            <Link
                                                                // target="_blank"
                                                                style={{padding: 0}}
                                                                to={`${usecase}`
                                                                    .replace(/ /g, "")
                                                                    .toLowerCase() + `?usecase=${usecase}`}
                                                                relative={"route"}
                                                                onClick={() => setUsecase(usecase)}
                                                            >
                                                                <Card className={commonStyles.landingPageChildCard}>
                                                                    <Card.Body>
                                                                        <AiFillWechat style={{ fontSize: '46px' }} />
                                                                        <span className={commonStyles.cardBodyTile}>{usecase}</span>
                                                                    </Card.Body>
                                                                </Card>
                                                            </Link>
                                                        </div>
                                                    ))}
                                                    
                                                </>
                                            ) : (<></>) }
                                            </>
                                        )}
                                    </Row>
                                </Card.Body>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default LandingPage;

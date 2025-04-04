<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" 
                xmlns:exsl="http://exslt.org/common"
                xmlns:x="http://www.tei-c.org/ns/1.0"
                xmlns:tst="https://github.com/tst-project"
                exclude-result-prefixes="x tst exsl">

<xsl:output method="text" encoding="UTF-8" omit-xml-declaration="yes"/>

<xsl:template name="repeat">
    <xsl:param name="output" />
    <xsl:param name="count" />
    <xsl:if test="$count &gt; 0">
        <xsl:value-of select="$output" />
        <xsl:call-template name="repeat">
            <xsl:with-param name="output" select="$output" />
            <xsl:with-param name="count" select="$count - 1" />
        </xsl:call-template>
    </xsl:if>
</xsl:template>

<xsl:template name="langstart">
    <xsl:if test="./@xml:lang='ta'"><xsl:text>\texttamil{</xsl:text></xsl:if>
</xsl:template>
<xsl:template name="langend">
    <xsl:if test="./@xml:lang='ta'"><xsl:text>}</xsl:text></xsl:if>
</xsl:template>
<xsl:template name="splitwit">
    <xsl:param name="mss" select="@wit | @select"/>
    <xsl:variable name="msstring" select="substring-before(
                            concat($mss,' '),
                          ' ')"/>

    <xsl:variable name="cleanstr" select="substring-after($msstring,'#')"/>
    <xsl:variable name="witness" select="//x:listWit//x:witness[@xml:id=$cleanstr]"/>
    <xsl:variable name="siglum" select="$witness/x:abbr/node()"/>
             <!-- TODO: subvariants
             <xsl:variable name="spacestring">
                <xsl:text> </xsl:text>
                <xsl:value-of select="$msstring"/>
                <xsl:text> </xsl:text>
             </xsl:variable>
             <xsl:variable name="par" select="x:rdgGrp | ."/>
             <xsl:choose>
                 <xsl:when test="$par/x:rdg[not(@type='main')][contains(concat(' ', normalize-space(@wit), ' '),$spacestring)]">
                    <xsl:attribute name="class">msid mshover</xsl:attribute>
                 </xsl:when>
                 <xsl:otherwise>
                    <xsl:attribute name="class">msid</xsl:attribute>
                 </xsl:otherwise>
             </xsl:choose>
             -->
    <xsl:choose>
        <xsl:when test="$siglum">
            <xsl:apply-templates select="$siglum"/>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="$cleanstr"/>
        </xsl:otherwise>
    </xsl:choose>
    <xsl:variable name="nextstr" select="substring-after($mss, ' ')"/>
    <xsl:if test="string-length($nextstr)">
        <xsl:text> </xsl:text>
        <xsl:call-template name="splitwit">
            <xsl:with-param name="mss" select="$nextstr"/>
        </xsl:call-template>
    </xsl:if>
</xsl:template>

<xsl:template match="x:TEI">
    <xsl:text>\documentclass[12pt]{extarticle}
\usepackage{polyglossia,fontspec,xunicode}
\usepackage[normalem]{ulem}
\usepackage[noend,noeledsec,noledgroup]{reledmac}
\usepackage{reledpar}
\usepackage[top=1in, bottom=1.5in,right=1in,left=1in]{geometry}
\usepackage{setspace}
\usepackage{xcolor}
\usepackage[colorlinks,linkcolor=olive]{hyperref}

\arrangementX[A]{paragraph}
\arrangementX[B]{paragraph}
\renewcommand*{\thefootnoteB}{\Roman{footnoteB}}
\arrangementX[C]{paragraph}
\renewcommand*{\thefootnoteC}{\roman{footnoteC}}

\Xarrangement[A]{paragraph}
\Xnotenumfont[A]{\bfseries}
\Xlemmafont[A]{\bfseries}

\setdefaultlanguage{english}
\setmainfont{Brill}

\setotherlanguage{tamil}
\newfontfamily\tamilfont{TSTTamil.otf}[Script=Tamil,Ligatures=Historic,BoldFont={NotoSerifTamil-Bold.ttf}]
\newICUfeature{AllAlternates}{1}{+aalt}
\newcommand{\vowelsign}{\tamilfont\addfontfeature{AllAlternates=1}}
\tamilfont\fontdimen2\font=0.8em
\tamilfont\large\fontdimen2\font=0.5em

\setlength{\parskip}{12pt}

\setstanzaindents{1,0,0}
\setcounter{stanzaindentsrepetition}{2}

\begin{document}

\onehalfspacing
\lineation{page}
    </xsl:text>
    <xsl:apply-templates select="x:text"/>
    <xsl:text>
\end{document}</xsl:text>
</xsl:template>

<xsl:template match="x:text">
    <xsl:apply-templates/>
</xsl:template>

<xsl:template match="x:div[@rend='parallel']">
    <xsl:text>
\begin{pages}
\begin{Leftside}
\beginnumbering
</xsl:text>
    <xsl:apply-templates select="./*[@type='edition']"/>
    <xsl:text>
\endnumbering
\end{Leftside}
\begin{Rightside}
\beginnumbering
\numberlinefalse
</xsl:text>
    <xsl:apply-templates select="./*[@type='translation']"/>
    <xsl:text>
\endnumbering
\end{Rightside}
\end{pages}
\Pages
</xsl:text>
</xsl:template>
<xsl:template match="x:p">
<xsl:text>
\pstart</xsl:text>
<xsl:call-template name="langstart"/>
<xsl:text>
</xsl:text>
<xsl:apply-templates/><xsl:text>
</xsl:text>
<xsl:call-template name="langend"/>
<xsl:text>\pend

</xsl:text>
</xsl:template>

<xsl:template match="x:lg">
    <xsl:text>
\stanza[\smallskip]

</xsl:text><xsl:apply-templates select="x:l | x:trailer"/>
<xsl:text>

</xsl:text>
</xsl:template>

<xsl:template match="x:lg/x:l">
<!--xsl:text>\large </xsl:text-->
<xsl:call-template name="langstart"/>
<xsl:apply-templates/>
<xsl:call-template name="langend"/>
<xsl:text>&amp;
</xsl:text>
</xsl:template>

<xsl:template match="x:lg/x:l[position()=last()]">
<!--xsl:text>\large </xsl:text-->
<xsl:call-template name="langstart"/>
<xsl:apply-templates/>
<xsl:call-template name="langend"/>
<xsl:text>\&amp;
</xsl:text>
</xsl:template>

<xsl:template match="milestone">
<xsl:variable name="no" select="@n"/>
<xsl:text>(From </xsl:text><xsl:value-of select="$no"/><xsl:text>)</xsl:text>
</xsl:template>

<xsl:template match="x:hi[@rend='subscript']">
<xsl:text>\textsubscript{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:hi[@rend='superscript']">
<xsl:text>\textsuperscript{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:hi[@rend='italic']">
<xsl:text>\emph{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>
<xsl:template match="x:term">
    <xsl:call-template name="langstart"/>
    <xsl:apply-templates/>
    <xsl:call-template name="langend"/>
</xsl:template>

<xsl:template match="x:label">
<xsl:text>\textsc{[</xsl:text><xsl:apply-templates /><xsl:text>]}</xsl:text>
</xsl:template>

<xsl:template match="x:unclear">
<xsl:text>{\color{lightgray}(}</xsl:text><xsl:apply-templates/><xsl:text>{\color{lightgray})}</xsl:text>
</xsl:template>

<xsl:template match="x:subst">
    <xsl:apply-templates />
</xsl:template>

<xsl:template match="x:choice">
    <xsl:apply-templates />
</xsl:template>

<xsl:template match="x:choice/x:seg[1]">
    <xsl:text>&lt;</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>&gt;</xsl:text>
</xsl:template>
<xsl:template match="x:choice/x:seg[position() > 1]">
    <xsl:text>/&lt;</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>&gt;</xsl:text>
</xsl:template>

<xsl:template match="x:del">
    <xsl:text>\uuline{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:sic">
    <xsl:text>\textenglish{\color{lightgray}¿}</xsl:text><xsl:apply-templates/><xsl:text>\textenglish{\color{lightgray}?}</xsl:text>
</xsl:template>

<xsl:template match="x:surplus">
        <xsl:text>\uwave{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
</xsl:template>


<xsl:template match="x:orig">
        <xsl:text>\uwave{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:add">
        <xsl:text>\textbf{</xsl:text><xsl:apply-templates /><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:corr">
        <xsl:text>(\textbf{</xsl:text><xsl:apply-templates /><xsl:text>})</xsl:text>
</xsl:template>

<xsl:template match="x:lb">
    <xsl:text>\textenglish{\textbf{⸤}}</xsl:text>
    <!--
        <xsl:text>\textsc{(</xsl:text>
        <xsl:choose>
            <xsl:when test="@n">
                <xsl:text>l. </xsl:text><xsl:value-of select="@n"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>line break</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:text>)}</xsl:text>
    -->
</xsl:template>

<xsl:template match="x:pb">
    <xsl:text>\textenglish{\textbf{⎡}}</xsl:text>
    <!--
        <xsl:text>\textsc{(</xsl:text>
        <xsl:choose>
            <xsl:when test="@n">
                <xsl:text>f. </xsl:text><xsl:value-of select="@n"/>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>page break</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
        <xsl:text>)}</xsl:text>
    -->
</xsl:template>

<xsl:template match="x:g">
    <xsl:text>\uwave{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>           
</xsl:template>
<xsl:template match="x:g[@rend='vowel-sign']">
    <xsl:text>\vowelsign{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>           
</xsl:template>

<xsl:template match="x:supplied">
    <xsl:text>(\textbf{</xsl:text><xsl:apply-templates/><xsl:text>})</xsl:text>
</xsl:template>

<xsl:template match="x:locus">
    <xsl:text>\textsc{</xsl:text>
    <xsl:choose>
    <xsl:when test="@target">
        <xsl:text>&lt;</xsl:text><xsl:value-of select="@target"/><xsl:text>&gt;</xsl:text>
    </xsl:when>
    <xsl:otherwise>
        <xsl:text>&lt;</xsl:text><xsl:apply-templates/><xsl:text>&gt;</xsl:text>
    </xsl:otherwise>
    </xsl:choose>
    <xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:gap">
    <xsl:text>\textenglish{[</xsl:text>
    <xsl:variable name="quantity">
        <xsl:choose>
            <xsl:when test="@quantity"><xsl:value-of select="@quantity"/></xsl:when>
            <xsl:otherwise>1</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:variable name="gapchar">
        <xsl:choose>
            <xsl:when test="@reason = 'illegible'">?</xsl:when>
            <xsl:otherwise>‡</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:call-template name="repeat">
        <xsl:with-param name="output" select="$gapchar"/>
        <xsl:with-param name="count" select="$quantity"/>
    </xsl:call-template>
    <xsl:text>]}</xsl:text>
</xsl:template>

<xsl:template match="x:space">
    <xsl:variable name="quantity">
        <xsl:choose>
            <xsl:when test="@quantity"><xsl:value-of select="@quantity"/></xsl:when>
            <xsl:otherwise>1</xsl:otherwise>
        </xsl:choose>
    </xsl:variable>
    <xsl:call-template name="repeat">
        <xsl:with-param name="output">\_</xsl:with-param>
        <xsl:with-param name="count" select="$quantity"/>
    </xsl:call-template>
</xsl:template>

<xsl:template match="x:caesura">
<xsl:variable name="pretext" select="preceding::text()[1]"/>
<xsl:if test="normalize-space(substring($pretext,string-length($pretext))) != ''">
    <xsl:text>-</xsl:text>
</xsl:if>
    <xsl:text>&amp;
</xsl:text>
</xsl:template>
<xsl:template match="x:app//x:caesura"/>

<xsl:template match="x:note">
    <xsl:if test="@xml:lang='en'"><xsl:text>\textenglish{</xsl:text></xsl:if>
    <xsl:text>\emph{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
    <xsl:if test="@xml:lang='en'"><xsl:text>}</xsl:text></xsl:if>
</xsl:template>
<xsl:template match="x:note[@place='foot']">
    <xsl:text>\footnoteA{</xsl:text>
    <xsl:if test="@xml:lang='en'"><xsl:text>\textenglish{</xsl:text></xsl:if>
    <xsl:apply-templates/>
    <xsl:if test="@xml:lang='en'"><xsl:text>}</xsl:text></xsl:if>
    <xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:head[@type='sub']">
    <xsl:text>\textbf{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:hi">
    <xsl:text>\textbf{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:emph">
    <xsl:text>\emph{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:foreign">
    <xsl:text>\emph{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:metamark">
    <xsl:text>\textbf{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:item">
    <xsl:apply-templates/>
</xsl:template>

<xsl:template match="x:item/x:quote">
    <xsl:apply-templates/>
</xsl:template>

<xsl:template match="x:item/x:quote/x:lg/x:l">
    <xsl:apply-templates/>
</xsl:template>
-->
<xsl:template match="x:item/x:title">
    <xsl:text>\emph{</xsl:text><xsl:apply-templates/><xsl:text>}</xsl:text>
</xsl:template>

<xsl:template match="x:anchor[@type='lemma']">
    <xsl:text>\edlabel{</xsl:text>
    <xsl:value-of select="@n"/>
    <xsl:text>}</xsl:text>
</xsl:template>
<xsl:template match="x:app[x:rdg or x:rdgGrp]">
    <xsl:text>\edtext{}{\linenum{|\xlineref{</xsl:text>
    <xsl:value-of select="@corresp"/>
    <xsl:text>}}</xsl:text>
    <xsl:text>\lemma{</xsl:text>
    <xsl:apply-templates select=".//x:lem/node()"/>
    <xsl:text>}\Afootnote{</xsl:text>
    <xsl:text>\textenglish{</xsl:text>
    <xsl:call-template name="splitwit">
        <xsl:with-param name="mss" select="./x:lem/@wit | ./x:rdgGrp[@type='lemma']/@select"/>
    </xsl:call-template>
    <xsl:text>}</xsl:text>
    <xsl:text>; \texttamil{</xsl:text>
    <xsl:apply-templates select="./x:rdg | ./x:rdgGrp"/>
    <xsl:text>}}}</xsl:text>
</xsl:template>
<xsl:template match="x:lem"/>
<xsl:template match="x:rdgGrp[@type='lemma']"/>
<xsl:template match="x:rdg">
    <xsl:apply-templates/>
    <xsl:text> </xsl:text>
    <xsl:text>\textenglish{</xsl:text>
    <xsl:call-template name="splitwit"/>
    <xsl:text>}</xsl:text>
    <xsl:choose>
        <xsl:when test="position()=last()"> 
            <xsl:text>.</xsl:text>
        </xsl:when>
        <xsl:otherwise>
            <xsl:text>; </xsl:text>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>
<xsl:template match="x:rdgGrp">
    <xsl:apply-templates select="x:rdg[@type='main']/node()"/>
    <xsl:text> </xsl:text>
    <xsl:text>\textenglish{</xsl:text>
    <xsl:call-template name="splitwit"/>
    <xsl:text>}</xsl:text>

    <xsl:choose>
        <xsl:when test="position()=last()"> 
            <xsl:text>.</xsl:text>
        </xsl:when>
        <xsl:otherwise>
            <xsl:text>; </xsl:text>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template>
<xsl:template match="x:app[not(x:rdg) and x:note]">
    <xsl:apply-templates select="x:note"/>
</xsl:template>
<xsl:template match="x:app/x:note">
    <xsl:text>\footnoteA{</xsl:text>
    <xsl:apply-templates/>
    <xsl:text>}</xsl:text>
</xsl:template>
</xsl:stylesheet>
